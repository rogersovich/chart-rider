'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import Link from 'next/link';

interface ScoreEntry {
  id: string;
  username: string;
  score: number;
  time_secs: number;
  crashes: number;
  distance_percent: number;
  created_at: string;
}

interface LeaderboardViewProps {
  initialTicker?: string;
  initialPeriod?: string;
}

const PERIODS = ['3M', '6M', '1Y', 'ALL'];
const RANK_LABELS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
}

function formatScore(n: number) {
  return new Intl.NumberFormat('en-US').format(n);
}

export default function LeaderboardView({
  initialTicker = 'TSLA',
  initialPeriod = '1Y',
}: LeaderboardViewProps) {
  const [ticker, setTicker] = useState(initialTicker.toUpperCase());
  const [period, setPeriod] = useState(initialPeriod);
  const [tickerInput, setTickerInput] = useState(initialTicker.toUpperCase());
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  const [, startTransition] = useTransition();

  const fetchLeaderboard = useCallback(async (t: string, p: string) => {
    try {
      const res = await fetch(`/api/leaderboard?ticker=${t}&period=${p}`);
      const json = await res.json();
      startTransition(() => {
        setScores(json.scores ?? []);
        setDate(json.date ?? '');
        setOffline(json.offline ?? false);
        setLoading(false);
      });
    } catch {
      startTransition(() => {
        setOffline(true);
        setScores([]);
        setLoading(false);
      });
    }
  }, [startTransition]);

  useEffect(() => {
    startTransition(() => setLoading(true));
    fetchLeaderboard(ticker, period);
  }, [ticker, period, fetchLeaderboard, startTransition]);

  const handleTickerSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const t = tickerInput.trim().toUpperCase();
    if (t.length > 0) setTicker(t);
  };

  const handleShare = () => {
    const lines = scores.slice(0, 5).map(
      (s, i) => `${i + 1}. ${s.username} — ${formatScore(s.score)} pts`
    );
    const text = `🏆 ChartRider Leaderboard — $${ticker} · ${period}\n${lines.join('\n')}\nPlay at chartrider.com/${ticker}`;
    if (navigator.share) {
      navigator.share({ text });
    } else {
      navigator.clipboard.writeText(text);
      alert('Leaderboard copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🏆</span>
            <h1 className="font-heading font-black text-3xl text-text-primary tracking-tight">
              Leaderboard
            </h1>
          </div>
          <p className="text-sm text-text-secondary">
            Top riders for{' '}
            <span className="text-accent font-bold">${ticker}</span> ·{' '}
            <span className="font-semibold text-text-primary">{period}</span>
            {date && (
              <span className="text-text-muted ml-2">— {date}</span>
            )}
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Ticker search */}
          <form onSubmit={handleTickerSearch} className="flex gap-2 flex-1">
            <input
              type="text"
              value={tickerInput}
              onChange={e => setTickerInput(e.target.value.toUpperCase())}
              placeholder="Ticker (e.g. AAPL)"
              maxLength={12}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border-custom bg-surface
                         text-text-primary text-sm font-mono placeholder:text-text-muted
                         focus:outline-none focus:border-accent/50 transition-colors"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-accent text-black font-heading font-extrabold text-sm
                         hover:bg-accent-hover active:scale-95 transition-all cursor-pointer"
            >
              Search
            </button>
          </form>

          {/* Period pills */}
          <div className="flex gap-2">
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  period === p
                    ? 'bg-accent text-black'
                    : 'bg-surface border border-border-custom text-text-secondary hover:border-accent/50'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Offline banner */}
        {offline && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-sm font-medium">
            ⚠️ Leaderboard offline — Supabase not configured. Add credentials to <code className="font-mono text-xs">.env.local</code>.
          </div>
        )}

        {/* Table */}
        <div className="rounded-2xl border border-border-custom bg-surface overflow-hidden shadow-xl">
          {/* Table header */}
          <div className="grid grid-cols-[3rem_1fr_7rem_6rem_5rem_4rem] gap-0
                          border-b border-border-custom px-4 py-3
                          text-[10px] font-black uppercase tracking-widest text-text-muted">
            <span>#</span>
            <span>Player</span>
            <span className="text-right">Score</span>
            <span className="text-right">Time</span>
            <span className="text-right">Dist</span>
            <span className="text-right">Crashes</span>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="py-16 flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-text-muted">Loading scores...</span>
            </div>
          )}

          {/* Empty state */}
          {!loading && scores.length === 0 && (
            <div className="py-16 flex flex-col items-center gap-2 text-center">
              <span className="text-4xl">🏜️</span>
              <p className="font-heading font-bold text-text-primary">No scores yet today</p>
              <p className="text-sm text-text-muted">Be the first to ride <span className="text-accent">${ticker}</span>!</p>
            </div>
          )}

          {/* Score rows */}
          {!loading && scores.map((entry, idx) => {
            const rank = idx + 1;
            const isTop3 = rank <= 3;
            return (
              <div
                key={entry.id}
                className={`grid grid-cols-[3rem_1fr_7rem_6rem_5rem_4rem] gap-0 px-4 py-3.5
                            border-b border-border-custom/50 last:border-0 items-center
                            transition-colors hover:bg-surface-hover
                            ${rank === 1 ? 'bg-accent/5' : ''}`}
              >
                {/* Rank */}
                <span className={`font-heading font-black text-sm ${
                  isTop3 ? '' : 'text-text-muted'
                }`}>
                  {RANK_LABELS[rank] ?? `#${rank}`}
                </span>

                {/* Username */}
                <span className={`font-semibold text-sm truncate ${
                  rank === 1 ? 'text-accent' : 'text-text-primary'
                }`}>
                  {entry.username}
                </span>

                {/* Score */}
                <span className={`text-right font-mono font-bold text-sm tabular-nums ${
                  rank === 1 ? 'text-accent' : 'text-text-primary'
                }`}>
                  {formatScore(entry.score)}
                </span>

                {/* Time */}
                <span className="text-right font-mono text-xs text-text-secondary tabular-nums">
                  {formatTime(entry.time_secs)}
                </span>

                {/* Distance */}
                <span className="text-right font-mono text-xs text-text-secondary">
                  {entry.distance_percent}%
                </span>

                {/* Crashes */}
                <span className={`text-right font-mono text-xs ${
                  entry.crashes === 0 ? 'text-accent' : 'text-negative'
                }`}>
                  {entry.crashes === 0 ? '✓ 0' : `${entry.crashes} 💥`}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer actions */}
        <div className="mt-6 flex justify-between items-center">
          <p className="text-xs text-text-muted">
            Showing top {scores.length} of today&apos;s rides
          </p>
          {scores.length > 0 && (
            <button
              onClick={handleShare}
              className="px-4 py-2 rounded-xl text-sm font-heading font-bold
                         border border-border-custom text-text-secondary
                         hover:border-accent/50 hover:text-accent
                         transition-all cursor-pointer flex items-center gap-2"
            >
              🔗 Share Leaderboard
            </button>
          )}
        </div>

        {/* Back link */}
        <div className="mt-8 text-center">
          <Link href="/" className="text-sm text-text-muted hover:text-accent transition-colors">
            ← Back to ChartRider
          </Link>
        </div>
      </div>
    </div>
  );
}
