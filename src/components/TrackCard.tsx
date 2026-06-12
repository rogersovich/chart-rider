'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Track } from '@/data/mockTracks';

interface TrackCardProps {
  track: Track;
}

export default function TrackCard({ track }: TrackCardProps) {
  const router = useRouter();
  const { ticker, name, changePercent, difficulty, volatility, assetType, prices, description } = track;

  // Generate SVG path for the sparkline chart
  const generateSparkline = (data: number[], width = 200, height = 60, padding = 4) => {
    if (data.length === 0) return '';
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((price, idx) => {
      const x = padding + (idx / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - ((price - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  };

  const svgW = 220;
  const svgH = 70;
  const pathData = generateSparkline(prices, svgW, svgH);
  const isPositive = changePercent >= 0;

  // Difficulty colors matching the design system
  const difficultyBadgeStyle = () => {
    switch (difficulty) {
      case 'Easy':
        return 'bg-accent-glow text-accent border-accent/20 dark:text-accent';
      case 'Medium':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400';
      case 'Hard':
        return 'bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400';
      case 'Insane':
        return 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400';
      default:
        return 'bg-surface border-border-custom text-text-secondary';
    }
  };

  return (
    <div
      className="relative flex flex-col justify-between rounded-xl border border-border-custom bg-surface p-5 hover:border-text-secondary/30 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 group cursor-pointer overflow-hidden"
      onClick={() => router.push(`/${ticker}`)}
    >
      {/* Background glow hover effect */}
      <div className={`absolute -right-10 -bottom-10 w-28 h-28 rounded-full blur-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300 ${
        difficulty === 'Easy' || difficulty === 'Medium' ? 'bg-accent' : 'bg-negative'
      }`} />

      {/* Card Top Block */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5">
            <span className="font-heading font-black text-xl text-text-primary group-hover:text-accent transition-colors duration-200">
              {ticker}
            </span>
            <span className="text-[10px] text-text-muted px-1.5 py-0.5 rounded bg-background border border-border-custom uppercase font-semibold">
              {assetType}
            </span>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${difficultyBadgeStyle()}`}>
            {difficulty}
          </span>
        </div>

        <h4 className="text-xs font-semibold text-text-secondary line-clamp-1 mb-1" title={name}>
          {name}
        </h4>
        
        <div className="flex items-baseline gap-2 mb-4">
          <span className={`text-sm font-bold ${isPositive ? 'text-positive animate-pulse' : 'text-negative'}`}>
            {isPositive ? '+' : ''}{changePercent}%
          </span>
          <span className="text-[10px] text-text-muted">
            Vol: {volatility}%
          </span>
        </div>
      </div>

      {/* Visual Chart Area */}
      <div className="relative w-full h-20 bg-background/40 dark:bg-background/20 border border-border-custom/40 rounded-lg p-2 flex items-center justify-center mb-4 overflow-hidden shadow-inner">
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className={`w-full h-full ${
            isPositive 
              ? 'text-positive drop-shadow-[0_0_4px_rgba(5,150,105,0.2)] dark:drop-shadow-[0_0_4px_rgba(61,255,160,0.2)]' 
              : 'text-negative drop-shadow-[0_0_4px_rgba(220,38,38,0.2)] dark:drop-shadow-[0_0_4px_rgba(255,77,77,0.2)]'
          }`}
          preserveAspectRatio="none"
        >
          <path
            d={pathData}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Description text or Ride Indicator */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-border-custom/40">
        <span className="text-[10px] text-text-muted line-clamp-1 max-w-[70%]">
          {description || 'Interactive motocross chart ride.'}
        </span>
        <span className="text-xs font-heading font-black text-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-1">
          RIDE 🏍️
        </span>
      </div>
    </div>
  );
}
