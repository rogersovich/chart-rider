import React from 'react';
import Link from 'next/link';
import { getTrack } from '@/lib/dataStore';
import GameContainer from '@/components/GameContainer';
import MobileLock from '@/components/MobileLock';

interface PageProps {
  params: Promise<{ ticker: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { ticker } = await params;
  const track = getTrack(ticker);

  if (!track) {
    return {
      title: 'Track Not Found - ChartRider',
    };
  }

  return {
    title: `Riding ${track.ticker} (${track.name}) - ChartRider`,
    description: `Ride the motocross price track of ${track.name} on ChartRider. Don't crash!`,
  };
}

export default async function RidePage({ params }: PageProps) {
  const { ticker } = await params;
  const track = getTrack(ticker);

  if (!track) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-text-primary items-center justify-center p-4 text-center transition-colors duration-300">
        <div className="text-6xl mb-6">🏍️ 🚫</div>
        <h1 className="font-heading font-black text-3xl mb-2 text-negative">
          Track Not Available
        </h1>
        <p className="text-text-secondary max-w-md mb-8">
          Grafik untuk ticker &ldquo;{ticker.toUpperCase()}&rdquo; belum didukung atau tidak ditemukan.
        </p>
        <Link
          href="/"
          className="px-6 py-3 rounded-xl font-heading font-extrabold bg-surface border border-border-custom hover:bg-surface-hover transition-colors duration-200 cursor-pointer shadow-sm text-sm"
        >
          Kembali ke Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-text-primary selection:bg-accent/30 selection:text-text-primary overflow-hidden select-none transition-colors duration-300">
      <MobileLock />
      {/* Launch full screen game container */}
      <GameContainer track={track} />
    </div>
  );
}
