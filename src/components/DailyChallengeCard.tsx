'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { mockDailyChallenge } from '@/data/mockTracks';
import { getAllTracks } from '@/data/mockTracks';

// ── Types ─────────────────────────────────────────────────────────────────────
interface LeaderboardEntry {
  id: string;
  username: string;
  score: number;
  time_secs: number;
  crashes: number;
}

interface DailyChallenge {
  ticker: string;
  period: string;
  date: string;
  source: 'supabase' | 'fallback';
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatScore(num: number) {
  return new Intl.NumberFormat('en-US').format(num) + ' pts';
}

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = (secs % 60).toFixed(1).padStart(4, '0');
  return `${m}:${s}`;
}

function generateSvgPath(prices: number[], width: number, height: number, pad = 10) {
  if (prices.length < 2) return '';
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const points = prices.map((p, i) => {
    const x = pad + (i / (prices.length - 1)) * (width - pad * 2);
    const y = height - pad - ((p - min) / range) * (height - pad * 2);
    return `${x},${y}`;
  });
  return `M ${points.join(' L ')}`;
}

const RANK_LABELS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

// ── Component ─────────────────────────────────────────────────────────────────
export default function DailyChallengeCard() {
  const router = useRouter();

  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLB, setLoadingLB] = useState(false);

  // Resolve the actual track from the all-tracks list (or fall back to mock)
  const allTracks = getAllTracks();
  const resolvedTrack = challenge
    ? (allTracks.find(t => t.ticker === challenge.ticker) ?? mockDailyChallenge.track)
    : mockDailyChallenge.track;
  const currentPeriod = challenge?.period ?? '1Y';

  // Fetch daily challenge from API
  useEffect(() => {
    fetch('/api/daily-challenge')
      .then(r => r.json())
      .then((data: DailyChallenge) => setChallenge(data))
      .catch(() => {/* keep null → use mock below */});
  }, []);

  // Fetch mini leaderboard whenever challenge changes
  useEffect(() => {
    if (!challenge) return;
    let cancelled = false;
    Promise.resolve()
      .then(() => { if (!cancelled) setLoadingLB(true); })
      .then(() => fetch(`/api/leaderboard?ticker=${challenge.ticker}&period=${challenge.period}`))
      .then(r => r.json())
      .then(data => { if (!cancelled) setLeaderboard((data.scores ?? []).slice(0, 5)); })
      .catch(() => { if (!cancelled) setLeaderboard([]); })
      .finally(() => { if (!cancelled) setLoadingLB(false); });
    return () => { cancelled = true; };
  }, [challenge]);

  const svgWidth = 400;
  const svgHeight = 120;
  const sparklinePath = generateSvgPath(resolvedTrack.prices, svgWidth, svgHeight);

  // Use real leaderboard if available, otherwise fall back to mock mini data
  const displayLeaderboard = leaderboard.length > 0
    ? leaderboard
    : mockDailyChallenge.leaderboardMini.map(r => ({
        id: String(r.rank),
        username: r.player,
        score: r.score,
        time_secs: parseFloat(r.time.replace(':', '.')) * 60,
        crashes: r.crashes,
      }));

  const bestEntry = displayLeaderboard[0];

  return (
    <div className="max-w-4xl mx-auto px-4 mb-16">
      <div className="relative rounded-2xl border border-border-custom bg-surface p-6 sm:p-8 shadow-xl overflow-hidden group">
        {/* Accent glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-accent/5 rounded-full blur-2xl group-hover:bg-accent/10 transition-all duration-500" />

        {/* Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-custom pb-6 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold tracking-wider text-accent bg-accent-glow px-2.5 py-0.5 rounded-full uppercase border border-accent/20">
                ⚡ Daily Challenge
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20">
                {resolvedTrack.difficulty}
              </span>
              {challenge?.source === 'supabase' && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                  LIVE
                </span>
              )}
            </div>
            <h3 className="font-heading font-black text-2xl text-text-primary tracking-tight">
              {resolvedTrack.ticker} · {resolvedTrack.name}
            </h3>
            <p className="text-xs text-text-muted mt-0.5">{currentPeriod} period · {challenge?.date ?? 'Today'}</p>
          </div>

          <div className="text-left sm:text-right">
            {bestEntry ? (
              <>
                <p className="text-xs text-text-secondary">Best Today</p>
                <p className="font-heading font-bold text-lg text-text-primary">
                  {formatScore(bestEntry.score)}{' '}
                  <span className="text-xs font-normal text-text-secondary">by {bestEntry.username}</span>
                </p>
                <p className="text-xs text-text-secondary mt-0.5">{displayLeaderboard.length} riders competed</p>
              </>
            ) : (
              <>
                <p className="text-xs text-text-secondary">No scores yet</p>
                <p className="text-sm font-heading font-bold text-text-muted">Be first to ride!</p>
              </>
            )}
          </div>
        </div>

        {/* Card Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Chart + CTA */}
          <div className="md:col-span-6 flex flex-col justify-between h-full gap-6">
            <div>
              <p className="text-sm text-text-secondary mb-4 leading-relaxed">
                Ride today&apos;s featured track! Take the helm of{' '}
                <strong className="text-text-primary">{resolvedTrack.ticker}</strong>&apos;s{' '}
                {currentPeriod} chart — jump over high-volatility gaps and hit the nitro to dominate the leaderboard.
              </p>

              {/* Sparkline */}
              <div className="relative w-full bg-background border border-border-custom rounded-xl p-3 overflow-hidden h-36 flex items-center justify-center">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full h-full text-accent drop-shadow-[0_0_8px_var(--accent-primary-glow)]"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="sparkline-grad-dc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="currentColor" />
                      <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d={`${sparklinePath} L ${svgWidth - 10},${svgHeight - 10} L 10,${svgHeight - 10} Z`}
                    fill="url(#sparkline-grad-dc)"
                    className="opacity-10"
                  />
                  <path
                    d={sparklinePath}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="absolute bottom-2 left-3 text-[10px] text-text-muted">Start</div>
                <div className="absolute bottom-2 right-3 text-[10px] text-text-muted">Finish</div>
              </div>
            </div>

            <button
              onClick={() => router.push(`/${resolvedTrack.ticker}/ride?period=${currentPeriod}`)}
              className="w-full py-4 px-6 rounded-xl font-heading font-extrabold text-center
                         bg-accent text-black hover:bg-accent-hover transition-all duration-300
                         hover:scale-[1.02] hover:shadow-lg hover:shadow-accent-glow active:scale-95
                         flex items-center justify-center gap-2 cursor-pointer"
            >
              🏍️ Ride Today&apos;s Challenge
            </button>
          </div>

          {/* Mini Leaderboard */}
          <div className="md:col-span-6 border border-border-custom rounded-xl p-4 bg-background/50 backdrop-blur-sm">
            <h4 className="font-heading font-bold text-sm text-text-primary mb-3 uppercase tracking-wider flex items-center justify-between">
              <span>🏆 Daily Leaderboard</span>
              <div className="flex items-center gap-2">
                {loadingLB && (
                  <span className="w-3 h-3 border border-accent border-t-transparent rounded-full animate-spin block" />
                )}
                <a
                  href={`/leaderboard?ticker=${resolvedTrack.ticker}&period=${currentPeriod}`}
                  className="text-[10px] font-normal text-text-muted normal-case hover:text-accent transition-colors"
                >
                  Full table →
                </a>
              </div>
            </h4>

            {displayLeaderboard.length === 0 && !loadingLB ? (
              <div className="text-center py-6">
                <p className="text-sm text-text-muted">No scores yet — be first!</p>
              </div>
            ) : (
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="text-text-secondary border-b border-border-custom">
                    <th className="py-2 font-medium">Rank</th>
                    <th className="py-2 font-medium">Player</th>
                    <th className="py-2 font-medium text-right">Score</th>
                    <th className="py-2 font-medium text-right">Time</th>
                    <th className="py-2 font-medium text-center">Crashes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-custom/50 text-text-primary">
                  {displayLeaderboard.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-surface-hover/30 transition-colors duration-150">
                      <td className="py-2.5 font-bold text-text-secondary">
                        {RANK_LABELS[idx + 1] ?? `#${idx + 1}`}
                      </td>
                      <td className="py-2.5 font-medium truncate max-w-[80px]">{row.username}</td>
                      <td className="py-2.5 text-right font-semibold tabular-nums">
                        {new Intl.NumberFormat('en-US').format(row.score)}
                      </td>
                      <td className="py-2.5 text-right text-text-secondary font-mono">
                        {formatTime(row.time_secs)}
                      </td>
                      <td className="py-2.5 text-center font-mono">
                        {row.crashes > 0
                          ? <span className="text-negative">{row.crashes} 💥</span>
                          : <span className="text-accent">0</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
