'use client';

import React, { useEffect, useState } from 'react';
import { mockGlobalStats } from '@/data/mockTracks';

function CountUp({
  end,
  prefix = '',
  suffix = '',
  duration = 2000,
}: {
  end: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Use ease-out quad for smooth slowdown
      const easeProgress = progress * (2 - progress);
      setCount(Math.floor(easeProgress * end));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [end, duration]);

  const format = (num: number) => {
    return prefix + new Intl.NumberFormat('en-US').format(num) + suffix;
  };

  return <span className="tabular-nums">{format(count)}</span>;
}

export default function Hero() {
  const [stats, setStats] = useState({
    rides: mockGlobalStats.rides,
    virtualDollarsTraded: mockGlobalStats.virtualDollarsTraded,
    crashes: mockGlobalStats.crashes,
  });

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(data => {
        if (data.total_rides > 0) {
          setStats({
            rides: data.total_rides,
            virtualDollarsTraded: data.virtual_traded,
            crashes: data.total_crashes,
          });
        }
      })
      .catch(() => {/* keep mock values on error */});
  }, []);

  return (
    <section className="relative overflow-hidden pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Decorative gradient glowing blobs in background */}
      <div className="absolute top-0 left-1/4 -translate-x-1/2 w-80 h-80 rounded-full bg-accent/10 blur-3xl -z-10 dark:bg-accent/5" />
      <div className="absolute top-1/3 right-10 w-96 h-96 rounded-full bg-negative/5 blur-3xl -z-10" />

      <div className="text-center max-w-3xl mx-auto">
        <h2 className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase bg-accent-glow text-accent border border-accent/20 mb-6">
          <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
          Markets Meet Motocross
        </h2>
        
        <h1 className="font-heading font-extrabold text-5xl sm:text-6xl md:text-7xl text-text-primary tracking-tight leading-none mb-6">
          Ride the Market.<br />
          <span className="bg-gradient-to-r from-accent to-emerald-400 bg-clip-text text-transparent dark:to-emerald-300">
            Don&apos;t Crash.
          </span>
        </h1>

        <p className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed mb-10">
          Convert historical stock and crypto price data into 2D terrain. 
          Throttle up through bull rallies, jump over market corrections, and ride your favorite assets to the top of the daily leaderboard.
        </p>

        {/* Global Statistics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto p-1.5 rounded-2xl border border-border-custom bg-surface/50 backdrop-blur-md shadow-lg">
          {/* Stat 1 */}
          <div className="flex flex-col items-center justify-center p-6 rounded-xl bg-surface border border-border-custom shadow-sm transition-transform hover:scale-[1.02]">
            <dt className="text-sm font-medium text-text-secondary mb-2 flex items-center gap-1.5">
              🏍️ Total Rides
            </dt>
            <dd className="text-3xl font-heading font-black text-text-primary tracking-tight">
              <CountUp end={stats.rides} />
            </dd>
          </div>

          {/* Stat 2 */}
          <div className="flex flex-col items-center justify-center p-6 rounded-xl bg-surface border border-border-custom shadow-sm transition-transform hover:scale-[1.02]">
            <dt className="text-sm font-medium text-text-secondary mb-2 flex items-center gap-1.5">
              💰 Virtual Value Traded
            </dt>
            <dd className="text-3xl font-heading font-black text-accent tracking-tight">
              <CountUp end={stats.virtualDollarsTraded} prefix="$" />
            </dd>
          </div>

          {/* Stat 3 */}
          <div className="flex flex-col items-center justify-center p-6 rounded-xl bg-surface border border-border-custom shadow-sm transition-transform hover:scale-[1.02]">
            <dt className="text-sm font-medium text-text-secondary mb-2 flex items-center gap-1.5 animate-pulse text-negative">
              💥 Crashes Avoided
            </dt>
            <dd className="text-3xl font-heading font-black text-negative tracking-tight">
              <CountUp end={stats.crashes} />
            </dd>
          </div>
        </div>
      </div>
    </section>
  );
}
