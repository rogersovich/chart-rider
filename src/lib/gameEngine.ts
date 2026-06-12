import { Engine, World, Bodies, Body, Constraint, Events } from 'matter-js';
import { Track } from '@/data/mockTracks';
import { GAME_CONSTANTS } from '@/lib/gameConstants';
import { getNormalizedCoordinates, smoothPrices, simplifyPricesRDP } from '@/lib/chartUtils';
import { AudioEngine } from '@/lib/audioEngine';

export interface GameTelemetry {
  score: number;
  time: number;
  timeLeft: number;
  nitro: number;
  speed: number;
  progress: number;
  crashes: number;
  status: 'Grounded' | 'Airborne' | 'Nitro Boost' | 'Crashed';
}

export interface GameEngineOptions {
  canvas: HTMLCanvasElement;
  track: Track;
  period: string;
  isSmoothed: boolean;
  onTelemetry: (data: GameTelemetry) => void;
  onGameOver: (outcome: 'victory' | 'defeat', finalScore: number, finalTime: number, crashes: number, progress: number) => void;
}

export class GameEngine {
  private engine: Engine;
  private world: World;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private track: Track;
  private prices: number[];
  private coordinates: { x: number; y: number }[] = [];
  
  // Game states
  private score: number = 0;
  private maxReachedX: number = 0;
  private crashes: number = 0;
  private startTime: number = 0;
  private elapsedTime: number = 0; // in seconds
  private totalDuration: number = 60; // in seconds
  private nitro: number = GAME_CONSTANTS.MAX_NITRO;
  private isPaused: boolean = false;
  private isGameOver: boolean = false;
  private status: GameTelemetry['status'] = 'Airborne';
  private airTimeStart: number | null = null;
  private isGrounded: boolean = false;
  private prevGrounded: boolean = false; // for land-detection
  
  // Physics bodies
  private bike!: {
    chassis: Body;
    wheelA: Body; // rear
    wheelB: Body; // front
    suspensionA: Constraint;
    suspensionB: Constraint;
  };
  
  // Controls
  private keys: Record<string, boolean> = {};
  private wasJumpPressed: boolean = false;
  private wasResetPressed: boolean = false;
  
  // Camera & checkpoints
  private camera = { x: 0, y: 0 };
  private lastCheckpoint = { x: 100, y: 300 };
  private trackLength: number = 1000;
  private endPositionX: number = 900;
  
  // Particle effects (nitro sparks, dirt kick-ups)
  private particles: { x: number; y: number; vx: number; vy: number; color: string; life: number; size: number }[] = [];
  
  // Callbacks
  private onTelemetry: GameEngineOptions['onTelemetry'];
  private onGameOver: GameEngineOptions['onGameOver'];
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  
  // Visual effects flags
  private alertText: string | null = null;
  private alertTimer: number = 0;
  private respawnDelayTimer: number = 0;
  private respawnType: 'auto' | 'checkpoint' | null = null;

  constructor(options: GameEngineOptions) {
    this.canvas = options.canvas;
    const context = this.canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D rendering context');
    this.ctx = context;
    
    this.track = options.track;
    this.onTelemetry = options.onTelemetry;
    this.onGameOver = options.onGameOver;

    // Slice prices based on period
    const isCrypto = this.track.assetType === 'crypto';
    let slicePoints = this.track.prices.length;
    if (options.period === '3M') slicePoints = isCrypto ? 90 : 63;
    else if (options.period === '6M') slicePoints = isCrypto ? 180 : 126;
    else if (options.period === '1Y') slicePoints = isCrypto ? 365 : 252;

    const pricesSlice = this.track.prices.slice(-slicePoints);
    this.prices = options.isSmoothed ? simplifyPricesRDP(pricesSlice, 0.045) : pricesSlice;

    // Setup track dynamic duration: proportional to length
    this.totalDuration = 30 + Math.floor(this.prices.length / 5) * 2;

    // Initialize Matter.js
    this.engine = Engine.create();
    this.world = this.engine.world;
    this.world.gravity.y = GAME_CONSTANTS.GRAVITY_Y;

    this.setupKeyboard();
    this.buildTerrain();
    this.buildBike();
    this.setupCollisions();
    
    // Start game loop
    this.startTime = Date.now();
    this.lastTime = performance.now();
    this.run();
  }

  private setupKeyboard() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    this.keys[e.code] = true;
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };

  private buildTerrain() {
    const spacing = GAME_CONSTANTS.SEGMENT_SPACING;
    const width = this.prices.length * spacing;
    this.trackLength = width;
    this.endPositionX = width - spacing;

    // Generate normalized terrain points
    this.coordinates = getNormalizedCoordinates(
      this.prices,
      width,
      GAME_CONSTANTS.CANVAS_HEIGHT,
      GAME_CONSTANTS.TRACK_PADDING_Y,
      spacing / 2
    );

    // Prepend a flat starting runway and append a flat ending runway
    const firstPoint = this.coordinates[0];
    if (firstPoint) {
      this.coordinates.unshift({
        x: firstPoint.x - 300,
        y: firstPoint.y
      });
    }

    const lastPoint = this.coordinates[this.coordinates.length - 1];
    if (lastPoint) {
      this.coordinates.push({
        x: lastPoint.x + 300,
        y: lastPoint.y
      });
    }

    // Create Matter static rectangle segments for each link
    for (let i = 0; i < this.coordinates.length - 1; i++) {
      const p1 = this.coordinates[i];
      const p2 = this.coordinates[i + 1];

      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      // Create thin segment body (2px) with exact length to create a perfectly smooth rolling surface without any edge bumps
      const segment = Bodies.rectangle(midX, midY, length, 2, {
        isStatic: true,
        friction: GAME_CONSTANTS.WHEEL_FRICTION,
        angle: angle,
        label: 'ground'
      });

      World.add(this.world, segment);
    }

    // Set initial checkpoint centered on starting runway
    if (this.coordinates.length > 1) {
      const runwayStart = this.coordinates[0].x;
      const runwayEnd = this.coordinates[1].x;
      this.lastCheckpoint = {
        x: (runwayStart + runwayEnd) / 2,
        y: this.coordinates[1].y - 46
      };
    } else if (this.coordinates.length > 0) {
      this.lastCheckpoint = {
        x: this.coordinates[0].x,
        y: this.coordinates[0].y - 46
      };
    }
  }

  private buildBike() {
    const startX = this.lastCheckpoint.x;
    const startY = this.lastCheckpoint.y;
    const group = Body.nextGroup(true); // Avoid collision between parts

    // Chassis
    const chassis = Bodies.rectangle(startX, startY, 56, 12, {
      collisionFilter: { group },
      density: GAME_CONSTANTS.BIKE_DENSITY,
      friction: GAME_CONSTANTS.CHASSIS_FRICTION,
      label: 'chassis'
    });

    // Wheels
    const wheelA = Bodies.circle(startX - 35, startY + 38, GAME_CONSTANTS.WHEEL_RADIUS, {
      collisionFilter: { group },
      density: GAME_CONSTANTS.WHEEL_DENSITY,
      friction: GAME_CONSTANTS.WHEEL_FRICTION,
      restitution: GAME_CONSTANTS.WHEEL_RESTITUTION,
      label: 'wheel'
    });

    const wheelB = Bodies.circle(startX + 35, startY + 38, GAME_CONSTANTS.WHEEL_RADIUS, {
      collisionFilter: { group },
      density: GAME_CONSTANTS.WHEEL_DENSITY,
      friction: GAME_CONSTANTS.WHEEL_FRICTION,
      restitution: GAME_CONSTANTS.WHEEL_RESTITUTION,
      label: 'wheel'
    });

    // Suspensions
    const suspensionA = Constraint.create({
      bodyA: chassis,
      pointA: { x: -35, y: 4 },
      bodyB: wheelA,
      stiffness: GAME_CONSTANTS.SUSPENSION_STIFFNESS,
      damping: GAME_CONSTANTS.SUSPENSION_DAMPING,
      length: GAME_CONSTANTS.SUSPENSION_LENGTH
    });

    const suspensionB = Constraint.create({
      bodyA: chassis,
      pointA: { x: 35, y: 4 },
      bodyB: wheelB,
      stiffness: GAME_CONSTANTS.SUSPENSION_STIFFNESS,
      damping: GAME_CONSTANTS.SUSPENSION_DAMPING,
      length: GAME_CONSTANTS.SUSPENSION_LENGTH
    });

    // Rigid swingarm struts to prevent suspension folding/collapsing
    const swingarmA = Constraint.create({
      bodyA: chassis,
      pointA: { x: -10, y: 0 },
      bodyB: wheelA,
      stiffness: 0.45,
      damping: 0.8,
      length: 40.6
    });

    const swingarmB = Constraint.create({
      bodyA: chassis,
      pointA: { x: 10, y: 0 },
      bodyB: wheelB,
      stiffness: 0.45,
      damping: 0.8,
      length: 40.6
    });

    World.add(this.world, [chassis, wheelA, wheelB, suspensionA, suspensionB, swingarmA, swingarmB]);
    this.bike = { chassis, wheelA, wheelB, suspensionA, suspensionB };
  }

  private setupCollisions() {
    Events.on(this.engine, 'collisionActive', (event) => {
      let grounded = false;
      event.pairs.forEach((pair) => {
        const labels = [pair.bodyA.label, pair.bodyB.label];
        if (labels.includes('wheel') && labels.includes('ground')) {
          grounded = true;
        }
      });
      this.isGrounded = grounded;
    });

    Events.on(this.engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        const labels = [pair.bodyA.label, pair.bodyB.label];
        // If chassis hits the ground -> Flipped rollover crash
        if (labels.includes('chassis') && labels.includes('ground')) {
          const angle = this.bike.chassis.angle;
          const normalizedAngle = Math.abs(((angle + Math.PI) % (2 * Math.PI)) - Math.PI);
          if (normalizedAngle > GAME_CONSTANTS.FLIP_CRASH_ANGLE) {
            this.handleRolloverCrash();
          }
        }
      });
    });
  }

  private handleRolloverCrash() {
    if (this.respawnDelayTimer > 0) return;
    this.score = Math.max(0, this.score - GAME_CONSTANTS.FLIP_CRASH_PENALTY);
    this.crashes++;
    this.triggerAlert('TUMBLING CRASH! -100 PTS 💥');
    AudioEngine.getInstance().playCrash();
    
    this.respawnDelayTimer = 1.5; // 1.5 seconds delay before auto-respawn
    this.respawnType = 'auto';
  }

  private triggerAutoRecovery() {
    // Forgiving Option B: reset orientation, push slightly up, halt momentum
    const pos = this.bike.chassis.position;
    
    // Teleport higher above current spot to avoid ground clipping/overlap
    const targetY = pos.y - 80;
    
    Body.setPosition(this.bike.chassis, { x: pos.x, y: targetY });
    Body.setAngle(this.bike.chassis, 0);
    Body.setVelocity(this.bike.chassis, { x: 2, y: -2 }); // small kickstart
    Body.setAngularVelocity(this.bike.chassis, 0);

    Body.setPosition(this.bike.wheelA, { x: pos.x - 35, y: targetY + 38 });
    Body.setVelocity(this.bike.wheelA, { x: 0, y: 0 });
    Body.setAngularVelocity(this.bike.wheelA, 0);

    Body.setPosition(this.bike.wheelB, { x: pos.x + 35, y: targetY + 38 });
    Body.setVelocity(this.bike.wheelB, { x: 0, y: 0 });
    Body.setAngularVelocity(this.bike.wheelB, 0);

    this.spawnParticles(pos.x, pos.y, '#FF4D4D', 12);
  }

  private triggerCliffCrash() {
    if (this.respawnDelayTimer > 0) return;
    this.score = Math.max(0, this.score - GAME_CONSTANTS.CLIFF_CRASH_PENALTY);
    this.crashes++;
    this.triggerAlert('PIT CRASH! -500 PTS 💥');
    AudioEngine.getInstance().playCrash();
    
    this.respawnDelayTimer = 1.5; // 1.5 seconds delay
    this.respawnType = 'checkpoint';
    
    // Freeze bike movement during checkpoint reset delay
    Body.setVelocity(this.bike.chassis, { x: 0, y: 0 });
    Body.setAngularVelocity(this.bike.chassis, 0);
    Body.setVelocity(this.bike.wheelA, { x: 0, y: 0 });
    Body.setAngularVelocity(this.bike.wheelA, 0);
    Body.setVelocity(this.bike.wheelB, { x: 0, y: 0 });
    Body.setAngularVelocity(this.bike.wheelB, 0);
  }

  private resetToCheckpoint() {
    // Instant checkpoint reset (e.g. from manual pressing 'R')
    const targetX = this.lastCheckpoint.x;
    const targetY = this.lastCheckpoint.y;

    Body.setPosition(this.bike.chassis, { x: targetX, y: targetY });
    Body.setAngle(this.bike.chassis, 0);
    Body.setVelocity(this.bike.chassis, { x: 0, y: 0 });
    Body.setAngularVelocity(this.bike.chassis, 0);

    Body.setPosition(this.bike.wheelA, { x: targetX - 35, y: targetY + 38 });
    Body.setVelocity(this.bike.wheelA, { x: 0, y: 0 });
    Body.setAngularVelocity(this.bike.wheelA, 0);

    Body.setPosition(this.bike.wheelB, { x: targetX + 35, y: targetY + 38 });
    Body.setVelocity(this.bike.wheelB, { x: 0, y: 0 });
    Body.setAngularVelocity(this.bike.wheelB, 0);

    this.spawnParticles(targetX, targetY, '#FF6B35', 18);
  }

  private triggerAlert(text: string) {
    this.alertText = text;
    this.alertTimer = 100; // frames duration
  }

  private spawnParticles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.8) * 8,
        color,
        life: 1.0,
        size: Math.random() * 4 + 2
      });
    }
  }

  private updateParticles() {
    this.particles = this.particles.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1; // gravity pull
      p.life -= 0.02;
      return p.life > 0;
    });
  }

  private getProgressPercent(): number {
    const startX = this.coordinates[0]?.x || 0;
    const totalX = this.endPositionX - startX;
    if (totalX <= 0) return 0;
    const progress = (this.bike.chassis.position.x - startX) / totalX;
    return Math.min(100, Math.max(0, Math.round(progress * 100)));
  }

  private applyPhysicsForces() {
    // 5. Manual Reset Key (R) - checked first so player can bypass/skip delay if desired
    if (this.keys['KeyR']) {
      if (!this.wasResetPressed) {
        this.resetToCheckpoint();
        this.wasResetPressed = true;
        this.respawnDelayTimer = 0;
        this.respawnType = null;
      }
      return;
    } else {
      this.wasResetPressed = false;
    }

    // Disable control inputs during crash delay
    if (this.respawnDelayTimer > 0) {
      this.status = 'Crashed';
      this.bike.wheelA.torque = 0;
      this.bike.wheelB.torque = 0;
      this.bike.chassis.torque = 0;
      return;
    }

    const isNitroPressed = this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.keys['KeyN'];
    const chassisAngle = this.bike.chassis.angle;

    // 1. Acceleration / Throttle
    if (this.keys['ArrowUp'] || this.keys['KeyW']) {
      let torque = GAME_CONSTANTS.ACCELERATION_TORQUE;
      
      if (isNitroPressed && this.nitro > 0) {
        if (this.status !== 'Nitro Boost') AudioEngine.getInstance().startNitro();
        this.status = 'Nitro Boost';
        this.nitro = Math.max(0, this.nitro - GAME_CONSTANTS.NITRO_CONSUMPTION);
        torque *= GAME_CONSTANTS.NITRO_DISTANCE_MULTIPLIER;
        
        // Thrust force along the bike's orientation
        const forceX = Math.cos(chassisAngle) * GAME_CONSTANTS.NITRO_ACCEL_FORCE;
        const forceY = Math.sin(chassisAngle) * GAME_CONSTANTS.NITRO_ACCEL_FORCE;
        
        Body.applyForce(this.bike.chassis, this.bike.chassis.position, { x: forceX, y: forceY });
        
        // Spawn exhaust sparks
        if (Math.random() > 0.4) {
          const isDark = document.documentElement.classList.contains('dark');
          const accentColor = isDark ? '#3DFFA0' : '#059669';
          const rearPos = this.bike.wheelA.position;
          this.particles.push({
            x: rearPos.x - Math.cos(chassisAngle) * 20,
            y: rearPos.y - Math.sin(chassisAngle) * 20,
            vx: -Math.cos(chassisAngle) * 5 + (Math.random() - 0.5) * 2,
            vy: -Math.sin(chassisAngle) * 5 + (Math.random() - 0.5) * 2,
            color: accentColor,
            life: 0.8,
            size: Math.random() * 3 + 2
          });
        }
      } else {
        if (this.status === 'Nitro Boost') AudioEngine.getInstance().stopNitro();
        this.status = this.isGrounded ? 'Grounded' : 'Airborne';
      }

      this.bike.wheelA.torque = torque;
    } 
    // 2. Brake / Reverse
    else if (this.keys['ArrowDown'] || this.keys['KeyS']) {
      Body.setAngularVelocity(this.bike.wheelA, this.bike.wheelA.angularVelocity * GAME_CONSTANTS.BRAKE_DAMPING);
      Body.setAngularVelocity(this.bike.wheelB, this.bike.wheelB.angularVelocity * GAME_CONSTANTS.BRAKE_DAMPING);
      
      // Reverse backing torque if grounded
      if (this.isGrounded) {
        this.bike.wheelA.torque = -GAME_CONSTANTS.ACCELERATION_TORQUE * 0.4;
      }
    }

    // 3. Lean controls (tilt rotation - active in air and on ground to get unstuck/wheelie)
    const leanSpeed = this.isGrounded ? GAME_CONSTANTS.LEAN_SPEED_GROUND : GAME_CONSTANTS.LEAN_SPEED_AIR;
    const perpX = -Math.sin(chassisAngle);
    const perpY = Math.cos(chassisAngle);
    
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
      // Rotate counter-clockwise (lean back): apply upward force on front wheel, downward force on rear wheel (relative to chassis)
      const forceMag = leanSpeed * 0.05 * this.bike.wheelB.mass;
      Body.applyForce(this.bike.wheelB, this.bike.wheelB.position, { x: perpX * -forceMag, y: perpY * -forceMag });
      Body.applyForce(this.bike.wheelA, this.bike.wheelA.position, { x: perpX * forceMag, y: perpY * forceMag });
      this.bike.chassis.torque = -leanSpeed * 0.5;
    }
    if (this.keys['ArrowRight'] || this.keys['KeyD']) {
      // Rotate clockwise (lean forward): apply downward force on front wheel, upward force on rear wheel (relative to chassis)
      const forceMag = leanSpeed * 0.05 * this.bike.wheelA.mass;
      Body.applyForce(this.bike.wheelB, this.bike.wheelB.position, { x: perpX * forceMag, y: perpY * forceMag });
      Body.applyForce(this.bike.wheelA, this.bike.wheelA.position, { x: perpX * -forceMag, y: perpY * -forceMag });
      this.bike.chassis.torque = leanSpeed * 0.5;
    }
    // Limit angular velocity to prevent crazy spinning
    const maxAngVel = GAME_CONSTANTS.LEAN_MAX_VELOCITY;
    if (this.bike.chassis.angularVelocity > maxAngVel) {
      Body.setAngularVelocity(this.bike.chassis, maxAngVel);
    } else if (this.bike.chassis.angularVelocity < -maxAngVel) {
      Body.setAngularVelocity(this.bike.chassis, -maxAngVel);
    }

    // 4. Jump (only if grounded)
    if (this.keys['Space']) {
      if (this.isGrounded && !this.wasJumpPressed) {
        // Jump force: launch upward relative to world, and push forward to keep momentum
        const jumpForceY = GAME_CONSTANTS.JUMP_IMPULSE * 0.28; // Upward force (negative)
        const jumpForceX = Math.abs(jumpForceY) * 0.45;        // Forward push
        
        // Apply force proportional to body mass to accelerate all parts identically
        Body.applyForce(this.bike.chassis, this.bike.chassis.position, {
          x: jumpForceX * this.bike.chassis.mass,
          y: jumpForceY * this.bike.chassis.mass
        });
        Body.applyForce(this.bike.wheelA, this.bike.wheelA.position, {
          x: jumpForceX * this.bike.wheelA.mass,
          y: jumpForceY * this.bike.wheelA.mass
        });
        Body.applyForce(this.bike.wheelB, this.bike.wheelB.position, {
          x: jumpForceX * this.bike.wheelB.mass,
          y: jumpForceY * this.bike.wheelB.mass
        });
        
        this.wasJumpPressed = true;
        this.isGrounded = false;
        AudioEngine.getInstance().playJump();
        this.spawnParticles(this.bike.chassis.position.x, this.bike.chassis.position.y + 10, '#ffffff', 8);
      }
    } else {
      this.wasJumpPressed = false;
    }

    // Recharge nitro fuel on ground
    if (this.isGrounded && !isNitroPressed) {
      this.nitro = Math.min(GAME_CONSTANTS.MAX_NITRO, this.nitro + GAME_CONSTANTS.NITRO_RECHARGE_RATE);
    }
  }

  private evaluateScoresAndStatus() {
    const posX = this.bike.chassis.position.x;
    
    // Scoring based on furthest X distance reached
    if (posX > this.maxReachedX) {
      const startX = this.coordinates[0]?.x || 0;
      const totalX = this.endPositionX - startX;
      
      if (totalX > 0) {
        const deltaX = posX - this.maxReachedX;
        const deltaPercent = deltaX / totalX;
        
        let scoreGain = deltaPercent * GAME_CONSTANTS.MAX_DISTANCE_POINTS;
        if (this.status === 'Nitro Boost') {
          scoreGain *= GAME_CONSTANTS.NITRO_DISTANCE_MULTIPLIER;
        }
        this.score += scoreGain;
      }
      this.maxReachedX = posX;
    }

    // Air time logic & score rewards
    if (!this.isGrounded) {
      if (this.airTimeStart === null) {
        this.airTimeStart = Date.now();
      } else {
        const duration = (Date.now() - this.airTimeStart) / 1000;
        if (duration > 1.0) {
          // Award small bonus per frame
          this.score += GAME_CONSTANTS.AIR_POINTS_PER_SEC / 60;
        }
      }
    } else {
      this.airTimeStart = null;
    }

    // Cap velocity to avoid excessive physics bugs
    const vel = this.bike.chassis.velocity;
    if (Math.abs(vel.x) > GAME_CONSTANTS.MAX_SPEED) {
      Body.setVelocity(this.bike.chassis, {
        x: Math.sign(vel.x) * GAME_CONSTANTS.MAX_SPEED,
        y: vel.y
      });
    }

    // Grounded checkpoints setter
    if (this.isGrounded && posX > this.lastCheckpoint.x + 350) {
      this.lastCheckpoint = { x: posX, y: this.bike.chassis.position.y - 30 };
    }

    // Cliff Fall crash detection
    if (this.bike.chassis.position.y > GAME_CONSTANTS.CANVAS_HEIGHT + 300) {
      this.triggerCliffCrash();
    }

    // Victory Check: crossed the finish line
    if (posX >= this.endPositionX) {
      this.isGameOver = true;
      this.score = Math.round(this.score + GAME_CONSTANTS.FINISH_BONUS_POINTS);
      AudioEngine.getInstance().stopNitro();
      AudioEngine.getInstance().playFinish();
      this.onGameOver('victory', this.score, this.elapsedTime, this.crashes, 100);
    }
  }

  private run = () => {
    if (this.isPaused || this.isGameOver) return;

    // Clock check
    this.elapsedTime = (Date.now() - this.startTime) / 1000;
    const timeLeft = Math.max(0, this.totalDuration - this.elapsedTime);

    // Defeat Check: Time's Up
    if (timeLeft <= 0) {
      this.isGameOver = true;
      this.onGameOver('defeat', Math.round(this.score), this.elapsedTime, this.crashes, this.getProgressPercent());
      return;
    }

    // Calculate actual elapsed time since the last animation frame
    const now = performance.now();
    let delta = now - (this.lastTime || now);
    this.lastTime = now;

    // Cap delta to prevent physics explosions in case of extreme lag or browser tab freezing
    if (delta > 60) delta = 16.67;

    // Run physics frame step with the calculated delta time for ultra-smooth rendering on high-refresh-rate screens (e.g. 120Hz ProMotion)
    Engine.update(this.engine, delta);

    // Handle respawn timer
    if (this.respawnDelayTimer > 0) {
      this.respawnDelayTimer -= 1 / 60;
      if (this.respawnDelayTimer <= 0) {
        this.respawnDelayTimer = 0;
        if (this.respawnType === 'auto') {
          this.triggerAutoRecovery();
        } else if (this.respawnType === 'checkpoint') {
          this.resetToCheckpoint();
        }
        this.respawnType = null;
      }
    }

    this.applyPhysicsForces();
    this.evaluateScoresAndStatus();
    this.updateParticles();

    // Camera follow offset logic
    const bikeX = this.bike.chassis.position.x;
    const bikeY = this.bike.chassis.position.y;
    
    // Lerp camera target
    this.camera.x += (bikeX - this.canvas.width / 3 - this.camera.x) * 0.1;
    this.camera.y += (bikeY - this.canvas.height / 2 - this.camera.y) * 0.05;

    // Render step
    this.render();

    // Send telemetry to overlay refs
    const speedKmh = Math.abs(this.bike.chassis.velocity.x) * 4;

    // Landing detection: was airborne last frame, now grounded
    if (this.isGrounded && !this.prevGrounded) {
      AudioEngine.getInstance().playLand();
    }
    this.prevGrounded = this.isGrounded;

    // Drive engine pitch
    AudioEngine.getInstance().setEngineSpeed(Math.abs(this.bike.chassis.velocity.x));

    this.onTelemetry({
      score: Math.round(this.score),
      time: Math.round(this.elapsedTime),
      timeLeft: Math.round(timeLeft),
      nitro: Math.round(this.nitro),
      speed: speedKmh,
      progress: this.getProgressPercent(),
      crashes: this.crashes,
      status: this.status
    });

    this.animationFrameId = requestAnimationFrame(this.run);
  };

  private render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Clear Canvas
    ctx.clearRect(0, 0, w, h);

    // Get current theme state from HTML class
    const isDark = document.documentElement.classList.contains('dark');
    
    // Draw Background Grid
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
    ctx.lineWidth = 1;
    const gridSpacing = 40;
    const startX = -Math.floor(this.camera.x) % gridSpacing;
    const startY = -Math.floor(this.camera.y) % gridSpacing;

    for (let x = startX; x < w; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = startY; y < h; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Apply Camera Translation
    ctx.save();
    ctx.translate(-this.camera.x, -this.camera.y);

    // 1. Draw Terrain Filling Area (fill below line)
    ctx.beginPath();
    ctx.moveTo(this.coordinates[0]?.x || 0, h + 500);
    this.coordinates.forEach((p) => {
      ctx.lineTo(p.x, p.y);
    });
    ctx.lineTo(this.coordinates[this.coordinates.length - 1]?.x || w, h + 500);
    ctx.closePath();
    
    const grad = ctx.createLinearGradient(0, 100, 0, h + 200);
    if (isDark) {
      grad.addColorStop(0, 'rgba(61, 255, 160, 0.04)');
      grad.addColorStop(1, 'rgba(10, 10, 10, 0.9)');
    } else {
      grad.addColorStop(0, 'rgba(5, 150, 105, 0.05)');
      grad.addColorStop(1, 'rgba(249, 250, 251, 0.9)');
    }
    ctx.fillStyle = grad;
    ctx.fill();

    // 2. Draw Terrain Line (Motocross Track)
    ctx.beginPath();
    this.coordinates.forEach((p, idx) => {
      if (idx === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.strokeStyle = isDark ? '#3DFFA0' : '#059669';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = isDark ? 8 : 0;
    ctx.shadowColor = isDark ? '#3DFFA0' : 'transparent';
    ctx.stroke();
    ctx.shadowBlur = 0; // reset glow

    // 3. Draw Finish Line Flag
    const finishX = this.endPositionX;
    const finishY = this.coordinates[this.coordinates.length - 1]?.y || h - 100;
    ctx.fillStyle = '#FF4D4D';
    ctx.beginPath();
    ctx.moveTo(finishX, finishY);
    ctx.lineTo(finishX + 25, finishY - 15);
    ctx.lineTo(finishX, finishY - 30);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = isDark ? '#ffffff' : '#111827';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(finishX, finishY);
    ctx.lineTo(finishX, finishY - 45);
    ctx.stroke();

    // 4. Draw Particles
    this.particles.forEach((p) => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0; // reset alpha

    // 5. Draw Motorcycle & Rider (Vector Canvas shapes)
    const cPos = this.bike.chassis.position;
    const cAngle = this.bike.chassis.angle;
    const wAPos = this.bike.wheelA.position;
    const wBPos = this.bike.wheelB.position;
    const accentColor = isDark ? '#3DFFA0' : '#059669';

    // Helper to draw coiled springs for suspension
    const drawCoiledSpring = (x1: number, y1: number, x2: number, y2: number, coils = 7, coilWidth = 5) => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      
      ctx.save();
      ctx.translate(x1, y1);
      ctx.rotate(angle);
      
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(len * 0.15, 0); // straight lead-in
      
      const coilLength = len * 0.7;
      const step = coilLength / coils;
      for (let c = 0; c < coils; c++) {
        const cx = len * 0.15 + c * step + step / 2;
        const cy = (c % 2 === 0 ? 1 : -1) * coilWidth;
        ctx.lineTo(cx, cy);
      }
      
      ctx.lineTo(len, 0); // straight lead-out
      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(17,24,39,0.45)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    };

    // Draw wheels
    [wAPos, wBPos].forEach((pos, idx) => {
      const wheelAngle = idx === 0 ? this.bike.wheelA.angle : this.bike.wheelB.angle;
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(wheelAngle);

      // Knobby tread pattern ticks (Black tires)
      ctx.strokeStyle = '#0F0F0F';
      ctx.lineWidth = 3;
      for (let t = 0; t < 12; t++) {
        ctx.rotate(Math.PI / 6);
        ctx.beginPath();
        ctx.moveTo(0, -16);
        ctx.lineTo(0, -21);
        ctx.stroke();
      }

      // Outer Tire (Black tires)
      ctx.strokeStyle = '#0F0F0F';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.stroke();

      // Glowing Rim Inner Line (Yellow rims)
      ctx.strokeStyle = '#FBBF24';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.stroke();

      // Rim / Hub Core
      ctx.fillStyle = isDark ? '#888888' : '#111827';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      // Spokes
      ctx.strokeStyle = isDark ? '#888888' : '#6b7280';
      ctx.lineWidth = 1.5;
      for (let s = 0; s < 4; s++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 12);
        ctx.stroke();
      }

      ctx.restore();
    });

    // 1. Draw Rear Swingarm (world space) - connects chassis center to rear wheel center
    ctx.strokeStyle = isDark ? '#4b5563' : '#374151';
    ctx.lineWidth = 5.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cPos.x - 8, cPos.y + 4);
    ctx.lineTo(wAPos.x, wAPos.y);
    ctx.stroke();

    // 2. Draw Front Fork (world space) - connects handlebar fork crown to front wheel center
    ctx.strokeStyle = isDark ? '#6b7280' : '#4b5563';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    // Calculate world position of the fork crown near the handlebar clamp
    const forkCrownX = cPos.x + Math.cos(cAngle) * 16 - Math.sin(cAngle) * -10;
    const forkCrownY = cPos.y + Math.sin(cAngle) * 16 + Math.cos(cAngle) * -10;
    ctx.moveTo(forkCrownX, forkCrownY);
    ctx.lineTo(wBPos.x, wBPos.y);
    ctx.stroke();

    // Draw Chassis frame & Rider details relative to chassis
    ctx.save();
    ctx.translate(cPos.x, cPos.y);
    ctx.rotate(cAngle);

    // 3. Muffler exhaust pipe at the rear
    ctx.strokeStyle = isDark ? '#555555' : '#9ca3af';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-5, 2);
    ctx.quadraticCurveTo(-15, -2, -22, -8);
    ctx.stroke();
    // Muffler exhaust tip (heat glow)
    ctx.fillStyle = '#FF6B35';
    ctx.beginPath();
    ctx.arc(-22, -8, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // 4. Main Dirt Bike Chassis Frame struts (Dark steel)
    ctx.strokeStyle = isDark ? '#374151' : '#1f2937';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-20, 2);
    ctx.lineTo(12, -4);
    ctx.lineTo(8, 4);
    ctx.lineTo(-20, 2);
    ctx.stroke();

    // 5. Engine Block (motocross style engine)
    ctx.fillStyle = isDark ? '#1a1a1a' : '#d1d5db';
    ctx.strokeStyle = isDark ? '#4b5563' : '#4b5563';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.rect(-6, -2, 12, 7);
    ctx.fill();
    ctx.stroke();

    // 6. Motocross Fuel Tank & Front Cowl Plastics (Yellow)
    ctx.fillStyle = '#FBBF24'; // Yellow tank
    ctx.beginPath();
    ctx.moveTo(16, -10); // near handlebars
    ctx.quadraticCurveTo(5, -17, -8, -10); // curved top tank line
    ctx.lineTo(-8, -2);
    ctx.lineTo(12, -4);
    ctx.closePath();
    ctx.fill();

    // 7. Motocross Seat (Black seat sweeping from tank to rear fender)
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.moveTo(-8, -10); // starts middle of tank
    ctx.quadraticCurveTo(-18, -8, -24, 0); // sweeping down-left
    ctx.lineTo(-12, 1);
    ctx.lineTo(-8, -2);
    ctx.closePath();
    ctx.fill();

    // 8. Yellow Rear Fender
    ctx.fillStyle = '#FBBF24';
    ctx.beginPath();
    ctx.moveTo(-24, 0);
    ctx.lineTo(-40, 5); // sweeps upward
    ctx.lineTo(-36, 9);
    ctx.lineTo(-20, 2);
    ctx.closePath();
    ctx.fill();

    // 9. Handlebars
    ctx.strokeStyle = isDark ? '#e5e7eb' : '#111827';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(16, -10); // handlebar mount
    ctx.lineTo(18, -20); // riser fork
    ctx.stroke();
    // Grip/handlebars horizontal bar
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(10, -20);
    ctx.lineTo(26, -20);
    ctx.stroke();

    // 10. Front Round Number Plate / Headlamp (White circle, matches reference image)
    ctx.fillStyle = '#f3f4f6';
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(22, -14, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 11. Rider stick figure (matches the reference image style)
    // Torso (grey stick body)
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-6, -8); // hip
    ctx.lineTo(-4, -22); // shoulder
    ctx.stroke();

    // Arm (grey stick arm reaching to handlebars)
    ctx.beginPath();
    ctx.moveTo(-4, -22); // shoulder
    ctx.lineTo(10, -20); // elbow
    ctx.lineTo(18, -20); // hand on grip
    ctx.stroke();

    // Leg (grey stick leg resting on pegs)
    ctx.beginPath();
    ctx.moveTo(-6, -8); // hip
    ctx.lineTo(-2, 0);  // knee
    ctx.lineTo(4, 0);   // foot on peg
    ctx.stroke();

    // Helmet (Red circular head/helmet, matches reference image)
    ctx.fillStyle = '#EF4444'; // Red helmet
    ctx.beginPath();
    ctx.arc(-3, -27, 5, 0, Math.PI * 2);
    ctx.fill();
    // Mini black visor tick
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(-1, -27, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    ctx.restore(); // restore camera transform

    // 6. Draw Screen Alert Text (crashes / warnings)
    if (this.alertText && this.alertTimer > 0) {
      ctx.fillStyle = 'rgba(10, 10, 10, 0.85)';
      ctx.strokeStyle = '#FF4D4D';
      ctx.lineWidth = 1.5;
      
      const textW = ctx.measureText(this.alertText).width;
      ctx.beginPath();
      ctx.roundRect(w / 2 - textW / 2 - 20, 60, textW + 40, 40, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FF4D4D';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.alertText, w / 2, 80);

      this.alertTimer--;
      if (this.alertTimer <= 0) {
        this.alertText = null;
      }
    }

    // 7. Draw Crash Respawn Countdown overlay
    if (this.respawnDelayTimer > 0) {
      ctx.save();
      // Semi-transparent overlay vignette
      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = 'rgba(17, 24, 39, 0.85)';
      ctx.beginPath();
      ctx.roundRect(w / 2 - 140, h / 2 - 30, 280, 60, 10);
      ctx.fill();
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`RESPAWNING IN ${this.respawnDelayTimer.toFixed(1)}s`, w / 2, h / 2);
      ctx.restore();
    }
  }

  // Lifecycle methods
  public pause() {
    this.isPaused = true;
  }

  public resume() {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.startTime = Date.now() - this.elapsedTime * 1000;
    this.lastTime = performance.now();
    this.run();
  }

  public cleanup() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    AudioEngine.getInstance().cleanup();
    World.clear(this.world, false);
    Engine.clear(this.engine);
  }
}
