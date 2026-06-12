import React from 'react';
import Link from 'next/link';
import { getTrack } from '@/lib/dataStore';
import Navbar from '@/components/Navbar';
import TrackDetail from '@/components/TrackDetail';
import Footer from '@/components/Footer';

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
    title: `Ride ${track.ticker} (${track.name}) - ChartRider`,
    description: `Ride the stock charts of ${track.name} on ChartRider. Volatility: ${track.volatility}%, Difficulty: ${track.difficulty}.`,
  };
}

export default async function TickerPage({ params }: PageProps) {
  const { ticker } = await params;
  const track = getTrack(ticker);

  if (!track) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-text-primary selection:bg-accent/30 selection:text-text-primary transition-colors duration-300">
        <Navbar />
        <main className="flex-grow flex flex-col items-center justify-center py-24 px-4 text-center">
          <div className="text-6xl mb-6">🏍️ 🚫</div>
          <h1 className="font-heading font-black text-3xl mb-2 text-negative">
            Track Not Available
          </h1>
          <p className="text-text-secondary max-w-md mb-8">
            Grafik untuk ticker <strong className="text-text-primary">&ldquo;{ticker.toUpperCase()}&rdquo;</strong> belum didukung atau tidak ditemukan dalam memory cache.
          </p>
          <Link
            href="/"
            className="px-6 py-3 rounded-xl font-heading font-extrabold bg-surface border border-border-custom hover:bg-surface-hover transition-colors duration-200 cursor-pointer shadow-sm text-sm"
          >
            Kembali ke Dashboard
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-text-primary selection:bg-accent/30 selection:text-text-primary transition-colors duration-300">
      <Navbar />
      <main className="flex-grow pb-16">
        <TrackDetail track={track} />
      </main>
      <Footer />
    </div>
  );
}
