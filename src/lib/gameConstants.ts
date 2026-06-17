export const GAME_CONSTANTS = {
  // Matter.js Physics Engine Settings
  GRAVITY_Y: 1.2,                // Global gravity pull on Y axis
  BIKE_DENSITY: 0.008,           // Density of chassis body
  WHEEL_DENSITY: 0.003,          // Density of circular wheels
  WHEEL_RADIUS: 20,              // Radius of circular wheels
  WHEEL_FRICTION: 0.95,          // Grip friction for wheels
  CHASSIS_FRICTION: 0.1,         // Slickness of chassis frame
  WHEEL_RESTITUTION: 0.0,        // Bounciness of tires
  
  // Bike Action & Controls
  ACCELERATION_TORQUE: 0.60,     // Torque applied to wheels (higher torque for fast acceleration)
  MAX_SPEED: 38,                 // Max horizontal speed (velocity x cap)
  BRAKE_DAMPING: 0.92 ,           // Velocity damping when braking
  LEAN_SPEED_AIR: 1.20,          // Angular velocity delta per frame in air (W/S/A/D/Arrows)
  LEAN_SPEED_GROUND: 0.35,       // Angular velocity delta per frame on ground
  LEAN_MAX_VELOCITY: 2.40,       // Maximum angular velocity limit for flips/tricks
  JUMP_IMPULSE: -0.58 ,            // Upward vertical force applied on chassis (Space)
  
  // Suspension spring constraints
  SUSPENSION_STIFFNESS: 0.35,    // Stiffness coefficient of constraints (stiffer to prevent folding)
  SUSPENSION_DAMPING: 0.95,      // Damping coefficient of constraints (dampen high velocity drops)
  SUSPENSION_LENGTH: 28,         // Standard length of springs
  
  // Nitro boost parameters
  MAX_NITRO: 100,                // Max fuel capacity
  NITRO_CONSUMPTION: 0.5,        // Fuel consumed per frame
  NITRO_RECHARGE_RATE: 0.12,     // Fuel recharged per frame when grounded
  NITRO_ACCEL_FORCE: 0.022,      // Extra horizontal thrust force during Nitro (stronger NOS)
  GROUND_TRACTION_FORCE: 0.012,  // Traction multiplier: force = torque × this (helps climb slopes)
  
  // Option B Crash Penalties & Recovery thresholds
  FLIP_CRASH_ANGLE: 1.5,         // Angle deviation threshold for terguling (~90deg)
  FLIP_CRASH_PENALTY: 100,       // Points deducted when bike rolls over (terguling)
  CLIFF_CRASH_PENALTY: 500,      // Points deducted when bike falls off grid (jurang)
  
  // Map Scaling & Coordinates (Normalization)
  SEGMENT_SPACING: 40,         // Horizontal space between price indices (width)
  CANVAS_HEIGHT: 600,            // Rendering height of HTML5 Canvas
  TRACK_PADDING_Y: 80,          // Padding from bottom/top to compress track vertical amplitude
  TRACK_HEIGHT_LIMIT: 400,       // Amplitude height limit for pricing range
  
  // Scoring points metrics
  MAX_DISTANCE_POINTS: 10000,    // Points for 100% completion
  AIR_POINTS_PER_SEC: 30,        // Points per second in air (grounded is false)
  FINISH_BONUS_POINTS: 2000,     // Victory bonus
  NITRO_DISTANCE_MULTIPLIER: 1.5,// Score multiplier when nitro is active
};
