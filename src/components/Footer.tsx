'use client';

import React from 'react';
import Link from 'next/link';

export default function Footer() {
  const shareTwitter = () => {
    const text = encodeURIComponent("Riding historical stock and crypto charts on ChartRider! Check it out! 🏍️📈");
    const url = encodeURIComponent("https://chartrider.com");
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  const shareLinkedIn = () => {
    const url = encodeURIComponent("https://chartrider.com");
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
  };

  return (
    <footer className="border-t border-border-custom bg-surface py-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center md:items-start gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shadow-md shadow-accent-glow">
              <img src="/icon.png" alt="ChartRider Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-heading font-extrabold text-lg tracking-wider">
              CHART<span className="text-accent">RIDER</span>
            </span>
          </div>
          <div className="flex gap-4 text-xs text-text-secondary">
            <Link href="/" className="hover:text-accent transition-colors">Home</Link>
            <Link href="/leaderboard" className="hover:text-accent transition-colors">Leaderboards</Link>
          </div>
        </div>

        <p className="text-xs text-text-secondary text-center md:max-w-md">
          All data is simulated and fetched from memory cache for gaming purposes. <strong>Not financial advice.</strong> Invest at your own risk. Built with real stock and crypto historical trends.
        </p>

        <div className="flex items-center gap-4">
          <button 
            onClick={shareTwitter}
            className="p-2 rounded-lg border border-border-custom bg-background hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors text-sm font-medium flex items-center gap-1 cursor-pointer"
          >
            <span>𝕏</span> Share
          </button>
          <button 
            onClick={shareLinkedIn}
            className="p-2 rounded-lg border border-border-custom bg-background hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors text-sm font-medium flex items-center gap-1 cursor-pointer"
          >
            <span>💼</span> LinkedIn
          </button>
        </div>
      </div>
      <div className="text-center text-[10px] text-text-muted mt-8">
        © {new Date().getFullYear()} ChartRider. All rights reserved. Markets Meet Motocross.
      </div>
    </footer>
  );
}
