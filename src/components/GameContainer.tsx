'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Track } from '@/data/mockTracks';
import { GameEngine } from '@/lib/gameEngine';
import { AudioEngine } from '@/lib/audioEngine';
import { smoothPrices, simplifyPricesRDP } from '@/lib/chartUtils';

interface GameContainerProps {
  track: Track;
}

interface GameOverState {
  outcome: 'victory' | 'defeat';
  finalScore: number;
  finalTime: number;
  crashes: number;
  progress: number;
}

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error' | 'anticheat' | 'ratelimit';

// Build SVG path string from price array for the minimap
function buildMinimapPath(prices: number[], w: number, h: number, pad = 4): string {
  if (prices.length < 2) return '';
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const points = prices.map((p, i) => {
    const x = pad + (i / (prices.length - 1)) * (w - pad * 2);
    const y = h - pad - ((p - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return `M ${points.join(' L ')}`;
}

// Get a single XY point at a given progress ratio along the price array
function getMinimapPoint(prices: number[], progress: number, w: number, h: number, pad = 4) {
  if (prices.length < 2) return { x: pad, y: h / 2 };
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const idx = Math.min(prices.length - 1, Math.max(0, Math.round(progress * (prices.length - 1))));
  const x = pad + (idx / (prices.length - 1)) * (w - pad * 2);
  const y = h - pad - ((prices[idx] - min) / range) * (h - pad * 2);
  return { x, y };
}

export default function GameContainer({ track }: GameContainerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [period, setPeriod] = useState('1Y');
  const [isSmoothed, setIsSmoothed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setPeriod(params.get('period') || '1Y');
      setIsSmoothed(params.get('smooth') === 'true');
    }
  }, []);

  // States managed in React (low-frequency updates only)
  const [isPaused, setIsPaused] = useState(false);
  const [gameOverState, setGameOverState] = useState<GameOverState | null>(null);

  // Nitro glow active state — updated via ref for performance, state for visual toggle
  const [isNitroActive, setIsNitroActive] = useState(false);
  const nitroActiveRef = useRef(false);

  // Audio state
  const [isMuted, setIsMuted] = useState(false);

  // Score submission state
  const [username, setUsername] = useState('');
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const [submittedRank, setSubmittedRank] = useState<number | null>(null);

  // DOM Refs for high-frequency telemetry (no re-renders)
  const scoreRef = useRef<HTMLSpanElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const speedRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const crashesRef = useRef<HTMLSpanElement>(null);
  const nitroBarRef = useRef<HTMLDivElement>(null);
  const nitroPanelRef = useRef<HTMLDivElement>(null);
  const progressTextRef = useRef<HTMLSpanElement>(null);
  // SVG minimap rider dot ref
  const minimapDotRef = useRef<SVGCircleElement>(null);

  // Minimap sparkline path (computed once from track prices + period)
  const minimapW = 160;
  const minimapH = 40;

  const minimapPrices = useMemo(() => {
    const isCrypto = track.assetType === 'crypto';
    let slicePoints = track.prices.length;
    if (period === '3M') slicePoints = isCrypto ? 90 : 63;
    else if (period === '6M') slicePoints = isCrypto ? 180 : 126;
    else if (period === '1Y') slicePoints = isCrypto ? 365 : 252;
    const slice = track.prices.slice(-slicePoints);
    return isSmoothed ? simplifyPricesRDP(slice, 0.045) : slice;
  }, [track, period, isSmoothed]);

  const minimapPath = useMemo(
    () => buildMinimapPath(minimapPrices, minimapW, minimapH),
    [minimapPrices]
  );

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!isMounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = 600;

    let lastNitroState = false;

    const engine = new GameEngine({
      canvas,
      track,
      period: period,
      isSmoothed: isSmoothed,
      onTelemetry: (telemetry) => {
        // All DOM updates — no setState here
        if (scoreRef.current) scoreRef.current.innerText = new Intl.NumberFormat('en-US').format(telemetry.score);
        if (timeRef.current) {
          const t = formatTime(telemetry.timeLeft);
          timeRef.current.innerText = t;
          // Flash red when under 10s
          timeRef.current.style.color = telemetry.timeLeft <= 10 ? '#FF4D4D' : '';
        }
        if (speedRef.current) speedRef.current.innerText = `${Math.round(telemetry.speed)} km/h`;
        if (statusRef.current) statusRef.current.innerText = telemetry.status;
        if (crashesRef.current) crashesRef.current.innerText = String(telemetry.crashes);
        if (progressTextRef.current) progressTextRef.current.innerText = `${telemetry.progress}%`;

        // Nitro bar fill
        if (nitroBarRef.current) {
          nitroBarRef.current.style.width = `${telemetry.nitro}%`;
          nitroBarRef.current.style.backgroundColor =
            telemetry.nitro < 25 ? '#FF4D4D' : telemetry.nitro < 50 ? '#F5A623' : 'var(--accent-primary)';
        }

        // Nitro panel glow — toggle React state only on change to avoid flood
        const nowNitro = telemetry.status === 'Nitro Boost';
        if (nowNitro !== lastNitroState) {
          lastNitroState = nowNitro;
          nitroActiveRef.current = nowNitro;
          setIsNitroActive(nowNitro);
        }
        if (nitroPanelRef.current) {
          nitroPanelRef.current.style.boxShadow = nowNitro
            ? '0 0 16px 4px rgba(61,255,160,0.35)'
            : 'none';
          nitroPanelRef.current.style.borderColor = nowNitro
            ? 'rgba(61,255,160,0.6)'
            : '';
        }

        // Move the minimap rider dot
        if (minimapDotRef.current && minimapPrices.length > 0) {
          const pt = getMinimapPoint(minimapPrices, telemetry.progress / 100, minimapW, minimapH);
          minimapDotRef.current.setAttribute('cx', String(pt.x));
          minimapDotRef.current.setAttribute('cy', String(pt.y));
        }
      },
      onGameOver: (outcome, finalScore, finalTime, crashes, progress) => {
        setGameOverState({ outcome, finalScore, finalTime, crashes, progress: progress ?? 0 });
      },
    });

    engineRef.current = engine;

    const handleResize = () => { canvas.width = window.innerWidth; };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      engine.cleanup();
    };
  }, [track, minimapPrices, period, isSmoothed]);

  // ESC + M key handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Unlock audio on first user interaction
      AudioEngine.getInstance().unlock();

      if (e.code === 'Escape' && !gameOverState) {
        if (isPaused) {
          engineRef.current?.resume();
          setIsPaused(false);
        } else {
          engineRef.current?.pause();
          setIsPaused(true);
        }
      }
      if (e.code === 'KeyM') {
        const muted = AudioEngine.getInstance().toggleMute();
        setIsMuted(muted);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPaused, gameOverState]);

  const togglePause = useCallback(() => {
    if (gameOverState) return;
    if (isPaused) {
      engineRef.current?.resume();
      setIsPaused(false);
    } else {
      engineRef.current?.pause();
      setIsPaused(true);
    }
  }, [isPaused, gameOverState]);

  const handleRestart = () => window.location.reload();

  const handleSubmitScore = async (state: GameOverState) => {
    if (!username.trim() || submitStatus === 'loading' || submitStatus === 'success') return;
    setSubmitStatus('loading');
    try {
      const res = await fetch('/api/submit-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: track.ticker,
          period,
          username: username.trim(),
          score: state.finalScore,
          time_secs: state.finalTime,
          crashes: state.crashes,
          distance_percent: state.progress,
        }),
      });
      const json = await res.json();
      if (res.status === 429) { setSubmitStatus('ratelimit'); return; }
      if (res.status === 422) { setSubmitStatus('anticheat'); return; }
      if (!res.ok) { setSubmitStatus('error'); return; }
      setSubmittedRank(json.rank ?? null);
      setSubmitStatus('success');
    } catch {
      setSubmitStatus('error');
    }
  };

  const handleShare = (state: GameOverState) => {
    const emoji = state.outcome === 'victory' ? '🏆' : '⏰';
    const text = `${emoji} ChartRider — Rode $${track.ticker} and scored ${new Intl.NumberFormat('en-US').format(state.finalScore)} pts in ${formatTime(state.finalTime)}! Crashes: ${state.crashes} 💥\nPlay at chartrider.com/${track.ticker}`;
    if (navigator.share) {
      navigator.share({ text });
    } else {
      navigator.clipboard.writeText(text);
      alert('Score copied to clipboard!');
    }
  };

  const handleScreenshot = (state: GameOverState) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create offscreen canvas for composited image
    const out = document.createElement('canvas');
    out.width = canvas.width;
    out.height = canvas.height;
    const ctx = out.getContext('2d');
    if (!ctx) return;

    // Draw game canvas
    ctx.drawImage(canvas, 0, 0);

    // Dark overlay for text legibility
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, out.width, out.height);

    // Score watermark
    ctx.textAlign = 'center';
    ctx.fillStyle = '#3DFFA0';
    ctx.font = `bold ${Math.round(out.width * 0.06)}px 'Space Grotesk', monospace`;
    ctx.fillText(`$${track.ticker} · ${new Intl.NumberFormat('en-US').format(state.finalScore)} pts`, out.width / 2, out.height * 0.42);

    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `${Math.round(out.width * 0.03)}px 'Inter', sans-serif`;
    ctx.fillText(`Time: ${formatTime(state.finalTime)}  |  Crashes: ${state.crashes}  |  Dist: ${state.progress}%`, out.width / 2, out.height * 0.52);

    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = `${Math.round(out.width * 0.025)}px 'Inter', sans-serif`;
    ctx.fillText('chartrider.com', out.width / 2, out.height * 0.62);

    // Trigger download
    const link = document.createElement('a');
    link.download = `chartrider-${track.ticker}-${state.finalScore}pts.png`;
    link.href = out.toDataURL('image/png');
    link.click();
  };

  if (!isMounted) {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-screen bg-background text-white select-none">
        <span className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mb-3" />
        <span className="font-heading font-black text-sm text-white/50 tracking-wider uppercase">Loading Track Data...</span>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-background overflow-hidden">

      {/* ── 1. TOP HUD BAR ── */}
      <div className="absolute top-0 left-0 right-0 z-20 px-4 py-3 flex items-center justify-between
                      bg-gradient-to-b from-black/85 dark:from-black/85 to-transparent
                      pointer-events-none select-none">

        {/* Left: Track + Speed + Status + Crashes */}
        <div className="flex items-center gap-3">
          {/* Track pill */}
          <div className="flex flex-col bg-black/60 dark:bg-black/60 border border-white/10 px-3 py-1.5 rounded-xl">
            <span className="text-[9px] font-semibold text-white/40 uppercase tracking-widest">Track</span>
            <span className="font-heading font-black text-base text-white tracking-wider flex items-center gap-1.5">
              🏍️ {track.ticker}
            </span>
          </div>

          <div className="h-8 w-px bg-white/10" />

          {/* Speed */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-semibold text-white/40 uppercase tracking-widest">Speed</span>
            <span ref={speedRef} className="font-mono text-sm font-bold text-white tabular-nums">0 km/h</span>
          </div>

          <div className="h-8 w-px bg-white/10" />

          {/* Rider Status */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-semibold text-white/40 uppercase tracking-widest">Status</span>
            <span ref={statusRef} className="text-xs font-bold text-accent uppercase tracking-wider">Airborne</span>
          </div>

          <div className="h-8 w-px bg-white/10" />

          {/* Crashes */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-semibold text-white/40 uppercase tracking-widest">Crashes</span>
            <span className="flex items-center gap-1 text-sm font-bold">
              <span ref={crashesRef} className="font-mono text-negative tabular-nums">0</span>
              <span className="text-xs">💥</span>
            </span>
          </div>
        </div>

        {/* Center: Timer */}
        <div className="flex flex-col items-center">
          <span className="text-[9px] text-white/40 uppercase tracking-widest font-semibold">Time Remaining</span>
          <span
            ref={timeRef}
            className="font-mono font-black text-4xl text-white tabular-nums"
            style={{ textShadow: '0 0 20px rgba(255,255,255,0.15)' }}
          >
            --:--
          </span>
        </div>

        {/* Right: Score + Pause */}
        <div className="flex items-center gap-4 pointer-events-auto">
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-white/40 uppercase tracking-widest font-semibold">Score</span>
            <span ref={scoreRef} className="font-heading font-black text-2xl text-accent tracking-wider tabular-nums">0</span>
          </div>
          <button
            onClick={togglePause}
            className="p-2.5 rounded-xl border border-white/15 bg-black/50 text-white hover:bg-white/10
                       active:scale-95 transition-all cursor-pointer text-lg leading-none"
          >
            {isPaused ? '▶' : '⏸'}
          </button>
          {/* Mute toggle */}
          <button
            onClick={() => {
              const muted = AudioEngine.getInstance().toggleMute();
              setIsMuted(muted);
            }}
            title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
            className="p-2.5 rounded-xl border border-white/15 bg-black/50 text-white hover:bg-white/10
                       active:scale-95 transition-all cursor-pointer text-lg leading-none"
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>

      {/* ── 2. SECONDARY HUD ROW: Nitro + Minimap ── */}
      <div className="absolute top-[72px] left-4 right-4 z-20 flex items-center justify-between pointer-events-none select-none">

        {/* Nitro Panel */}
        <div
          ref={nitroPanelRef}
          className="flex flex-col gap-1.5 w-44 bg-black/70 border border-white/10 p-2.5 rounded-xl transition-all duration-150"
        >
          <div className="flex items-center justify-between">
            <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${isNitroActive ? 'text-accent' : 'text-white/40'}`}>
              {isNitroActive ? '🚀 NITRO ACTIVE!' : '🚀 Nitro'}
            </span>
            <span className="text-[9px] text-white/30 font-mono">Shift/N</span>
          </div>
          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              ref={nitroBarRef}
              className="h-full rounded-full transition-all duration-75"
              style={{ width: '100%', backgroundColor: 'var(--accent-primary)' }}
            />
          </div>
        </div>

        {/* SVG Sparkline Minimap */}
        <div className="flex flex-col gap-1 bg-black/70 border border-white/10 px-3 pt-2 pb-1.5 rounded-xl">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[9px] text-white/40 uppercase tracking-widest font-semibold">Progress</span>
            <span ref={progressTextRef} className="text-[9px] font-mono font-bold text-accent">0%</span>
          </div>
          <svg
            width={minimapW}
            height={minimapH}
            viewBox={`0 0 ${minimapW} ${minimapH}`}
            className="overflow-visible"
          >
            {/* Track sparkline */}
            <path
              d={minimapPath}
              fill="none"
              stroke="rgba(61,255,160,0.35)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Start dot */}
            <circle
              cx={4}
              cy={(() => {
                const pt = getMinimapPoint(minimapPrices, 0, minimapW, minimapH);
                return pt.y;
              })()}
              r={2}
              fill="rgba(255,255,255,0.3)"
            />
            {/* Finish dot */}
            <circle
              cx={minimapW - 4}
              cy={(() => {
                const pt = getMinimapPoint(minimapPrices, 1, minimapW, minimapH);
                return pt.y;
              })()}
              r={2}
              fill="#FF4D4D"
            />
            {/* Animated rider dot */}
            <circle
              ref={minimapDotRef}
              cx={4}
              cy={minimapH / 2}
              r={3.5}
              fill="#3DFFA0"
              stroke="rgba(61,255,160,0.5)"
              strokeWidth="2"
              style={{ filter: 'drop-shadow(0 0 4px #3DFFA0)' }}
            />
          </svg>
        </div>
      </div>

      {/* ── 3. CANVAS ── */}
      <canvas
        ref={canvasRef}
        className="w-full shadow-2xl"
        style={{ height: '600px', display: 'block', backgroundColor: 'var(--background)' }}
      />

      {/* ── 4. CONTROLS GUIDE ── */}
      <div className="absolute bottom-4 z-20 px-4 py-2.5 rounded-2xl bg-black/75 border border-white/10
                      flex items-center gap-4 text-[10px] text-white/40 pointer-events-none select-none
                      font-medium tracking-wide">
        {[
          ['GAS', 'W / ↑'],
          ['LEAN', 'A/D · ←/→'],
          ['JUMP', 'Space'],
          ['NITRO', 'Shift/N'],
          ['RESET', 'R'],
          ['PAUSE', 'ESC'],
          ['MUTE', 'M'],
        ].map(([label, key], i, arr) => (
          <React.Fragment key={label}>
            <div><strong className="text-white/70">{label}:</strong> {key}</div>
            {i < arr.length - 1 && <div className="h-3 w-px bg-white/10" />}
          </React.Fragment>
        ))}
      </div>

      {/* ── 5. PAUSE MENU ── */}
      {isPaused && (
        <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-[#141414] border border-neutral-700 p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl">
            <div className="text-4xl mb-3">⏸️</div>
            <h2 className="font-heading font-black text-3xl text-white tracking-widest uppercase mb-6">Paused</h2>
            <div className="flex flex-col gap-3">
              <button
                onClick={togglePause}
                className="w-full py-3.5 px-4 rounded-xl font-heading font-extrabold bg-accent text-black
                           hover:bg-accent-hover transition-all cursor-pointer shadow-lg"
                style={{ boxShadow: '0 4px 20px rgba(61,255,160,0.25)' }}
              >
                ▶ Resume Run
              </button>
              <button
                onClick={handleRestart}
                className="w-full py-3 px-4 rounded-xl font-heading font-extrabold border border-neutral-700
                           text-white hover:bg-neutral-800 transition-all cursor-pointer"
              >
                🔄 Restart Track
              </button>
              <Link
                href={`/${track.ticker}`}
                className="w-full py-3 px-4 rounded-xl font-heading font-extrabold
                           bg-red-500/10 border border-red-500/25 text-red-400
                           hover:bg-red-500/20 transition-all cursor-pointer text-center block"
              >
                ✕ Quit Session
              </Link>
            </div>
            <p className="text-[10px] text-white/25 mt-5">Press ESC to resume quickly</p>
          </div>
        </div>
      )}

      {/* ── 6. GAME OVER SCREEN ── */}
      {gameOverState && (
        <div className="absolute inset-0 z-40 bg-black/92 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-300">
          <div className="bg-[#141414] border border-neutral-700 p-8 rounded-2xl max-w-md w-full shadow-2xl text-center">

            {/* Outcome header */}
            {gameOverState.outcome === 'victory' ? (
              <>
                <div className="text-6xl mb-4">🏆</div>
                <h2 className="font-heading font-black text-4xl text-accent tracking-tight uppercase mb-1">
                  You Made It!
                </h2>
                <p className="text-xs text-white/40 mb-6">
                  Anda berhasil menyelesaikan seluruh trek grafik pasar!
                </p>
              </>
            ) : (
              <>
                <div className="text-6xl mb-4">⏰</div>
                <h2 className="font-heading font-black text-4xl text-negative tracking-tight uppercase mb-1">
                  Time&apos;s Up!
                </h2>
                <p className="text-xs text-white/40 mb-6">
                  Waktu habis sebelum Anda menyelesaikan lintasan.
                </p>
              </>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-4 gap-3 border-y border-neutral-800 py-5 mb-6">
              {[
                { label: 'Score', value: new Intl.NumberFormat('en-US').format(gameOverState.finalScore), color: 'text-accent' },
                { label: 'Time', value: formatTime(gameOverState.finalTime), color: 'text-white' },
                { label: 'Distance', value: `${gameOverState.progress}%`, color: 'text-white' },
                { label: 'Crashes', value: `${gameOverState.crashes} 💥`, color: 'text-negative' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <span className="text-[9px] text-white/35 uppercase tracking-widest font-semibold">{label}</span>
                  <span className={`font-heading font-black text-base ${color} tabular-nums`}>{value}</span>
                </div>
              ))}
            </div>

            {/* ── Score Submission Form ── */}
            <div className="mb-6 px-1">
              {submitStatus === 'success' ? (
                <div className="flex flex-col items-center gap-1 py-3 px-4 rounded-xl
                                bg-accent/10 border border-accent/20">
                  <span className="text-2xl">🎯</span>
                  <p className="font-heading font-black text-accent text-lg">
                    {submittedRank !== null ? `#${submittedRank} Today!` : 'Score saved!'}
                  </p>
                  <p className="text-[10px] text-white/40">
                    <a href={`/leaderboard?ticker=${track.ticker}&period=${period}`}
                       className="underline hover:text-accent transition-colors">
                      View full leaderboard →
                    </a>
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] text-white/40 text-left font-semibold uppercase tracking-widest">
                    Submit to Leaderboard
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_\-.]/g, '').slice(0, 20))}
                      placeholder="Your username (e.g. moonrider)"
                      maxLength={20}
                      disabled={submitStatus === 'loading'}
                      className="flex-1 px-3 py-2.5 rounded-xl border border-neutral-700 bg-neutral-900
                                 text-white text-sm placeholder:text-white/25 font-mono
                                 focus:outline-none focus:border-accent/60 transition-colors disabled:opacity-50"
                    />
                    <button
                      onClick={() => gameOverState && handleSubmitScore(gameOverState)}
                      disabled={!username.trim() || submitStatus === 'loading'}
                      className="px-4 py-2.5 rounded-xl font-heading font-extrabold text-sm
                                 bg-accent text-black hover:bg-accent-hover transition-all
                                 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed
                                 flex items-center gap-1.5"
                    >
                      {submitStatus === 'loading' ? (
                        <><span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" /> Saving</>  
                      ) : 'Submit'}
                    </button>
                  </div>
                  {submitStatus === 'anticheat' && (
                    <p className="text-[10px] text-negative">❌ Score rejected by anti-cheat plausibility check.</p>
                  )}
                  {submitStatus === 'ratelimit' && (
                    <p className="text-[10px] text-amber-400">⚠️ Too many submissions. Wait a minute.</p>
                  )}
                  {submitStatus === 'error' && (
                    <p className="text-[10px] text-negative">⚠️ Submission failed. Leaderboard may be offline.</p>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleRestart}
                className="w-full py-4 px-6 rounded-xl font-heading font-extrabold text-base
                           bg-accent text-black hover:bg-accent-hover active:scale-95 transition-all
                           shadow-lg cursor-pointer"
                style={{ boxShadow: '0 4px 24px rgba(61,255,160,0.3)' }}
              >
                {gameOverState.outcome === 'victory' ? '🏍️ Play Again' : '🔄 Try Again'}
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleShare(gameOverState)}
                  className="py-3 px-4 rounded-xl font-heading font-extrabold text-xs
                             bg-blue-500/10 border border-blue-500/25 text-blue-400
                             hover:bg-blue-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  🔗 Share Link
                </button>
                <button
                  onClick={() => handleScreenshot(gameOverState)}
                  className="py-3 px-4 rounded-xl font-heading font-extrabold text-xs
                             bg-emerald-500/10 border border-emerald-500/25 text-emerald-400
                             hover:bg-emerald-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  📸 Save Image
                </button>
              </div>
              <Link
                href={`/leaderboard?ticker=${track.ticker}&period=${period}`}
                className="w-full py-3 px-6 rounded-xl font-heading font-extrabold text-sm
                           bg-amber-500/10 border border-amber-500/25 text-amber-400
                           hover:bg-amber-500/20 transition-all text-center cursor-pointer flex items-center justify-center gap-2"
              >
                🏆 View Leaderboard
              </Link>
              <Link
                href={`/${track.ticker}`}
                className="w-full py-3 px-6 rounded-xl font-heading font-extrabold text-sm
                           border border-neutral-700 text-white/60 hover:bg-neutral-800
                           transition-all text-center cursor-pointer block"
              >
                ← Back to Track Info
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
