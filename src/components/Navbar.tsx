'use client';

import React from 'react';
import Link from 'next/link';
import ThemeToggle from './ThemeToggle';
import { mockGlobalStats } from '@/data/mockTracks';

export default function Navbar() {
  // Format numbers for clean display
  const formatCompact = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(num);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border-custom bg-background/80 backdrop-blur-md transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer group">
          <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shadow-lg shadow-accent-glow transition-transform duration-300 group-hover:scale-110">
            <img src="/icon.png" alt="ChartRider Logo" className="w-full h-full object-cover" />
          </div>
          <span className="font-heading font-extrabold text-2xl tracking-wider text-text-primary">
            CHART<span className="text-accent group-hover:brightness-110 transition-all duration-300">RIDER</span>
          </span>
        </div>

        {/* Global Statistics Compact display */}
        <div className="hidden md:flex items-center gap-6 text-sm text-text-secondary bg-surface border border-border-custom px-4 py-1.5 rounded-full shadow-inner">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <span><strong>{formatCompact(mockGlobalStats.rides)}</strong> Rides</span>
          </div>
          <div className="h-3 w-px bg-border-custom" />
          <div>
            <span><strong>${formatCompact(mockGlobalStats.virtualDollarsTraded)}</strong> Traded</span>
          </div>
          <div className="h-3 w-px bg-border-custom" />
          <div>
            <span className="text-negative"><strong>{formatCompact(mockGlobalStats.crashes)}</strong> Crashes 💥</span>
          </div>
        </div>

        {/* Right Nav Options */}
        <div className="flex items-center gap-4">
          <nav className="hidden sm:flex items-center gap-1">
            <a
              href="#trending"
              className="px-3 py-2 text-sm font-medium rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors duration-200"
            >
              Trending
            </a>
            <a
              href="#legendary"
              className="px-3 py-2 text-sm font-medium rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors duration-200"
            >
              Legendary Crashes
            </a>
            <Link
              href="/leaderboard"
              className="px-3 py-2 text-sm font-medium rounded-lg text-text-secondary hover:text-accent hover:bg-surface-hover transition-colors duration-200 flex items-center gap-1"
            >
              🏆 Leaderboard
            </Link>
          </nav>
          <div className="h-5 w-px bg-border-custom hidden sm:block" />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
