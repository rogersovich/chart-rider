'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function MobileLock() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 1024 || 'ontouchstart' in window);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (!isMobile) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0a0a0a]/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
      <div className="text-7xl mb-6 animate-bounce">🏍️</div>
      <h1 className="font-heading font-black text-3xl text-white tracking-tight mb-3 uppercase">
        Desktop Only
      </h1>
      <p className="text-white/60 text-sm max-w-xs mb-2">
        ChartRider requires a keyboard & large viewport to play.
      </p>
      <p className="text-white/40 text-xs max-w-xs mb-8">
        Silakan buka di desktop untuk mulai berkendara di grafik pasar.
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link
          href="/leaderboard"
          className="px-6 py-3.5 rounded-xl bg-accent text-black font-heading font-extrabold text-sm hover:bg-accent-hover transition-all text-center shadow-lg active:scale-95"
          style={{ boxShadow: '0 4px 20px rgba(61,255,160,0.25)' }}
        >
          🏆 View Leaderboards
        </Link>
        <Link
          href="/"
          className="px-6 py-3 rounded-xl border border-white/10 text-white/70 hover:bg-white/5 font-heading font-extrabold text-sm transition-all text-center active:scale-95"
        >
          ← Go Back Home
        </Link>
      </div>
    </div>
  );
}
