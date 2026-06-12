import React from 'react';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import SearchBar from '@/components/SearchBar';
import DailyChallengeCard from '@/components/DailyChallengeCard';
import TrackCard from '@/components/TrackCard';
import Footer from '@/components/Footer';
import { mockTracks, mockLegendaryCrashes } from '@/data/mockTracks';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-text-primary transition-colors duration-300 selection:bg-accent/30 selection:text-text-primary">
      {/* Navigation */}
      <Navbar />

      {/* Main Content */}
      <main className="flex-grow pb-24">
        {/* Hero Banner with Stats */}
        <Hero />

        {/* Search Engine */}
        <SearchBar />

        {/* Daily Challenge Highlight */}
        <DailyChallengeCard />

        {/* Grid Sections container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          
          {/* Trending Tracks Section */}
          <section id="trending" className="scroll-mt-20">
            <div className="flex items-center justify-between border-b border-border-custom pb-4 mb-8">
              <div>
                <h3 className="font-heading font-black text-2xl tracking-tight">
                  🔥 Trending Tracks
                </h3>
                <p className="text-xs text-text-secondary mt-1">
                  Active and popular stock/crypto assets.
                </p>
              </div>
              <span className="text-xs font-semibold text-accent border border-accent/20 bg-accent-glow px-2.5 py-1 rounded-full uppercase">
                Curated
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {mockTracks.map((track) => (
                <TrackCard key={track.ticker} track={track} />
              ))}
            </div>
          </section>

          {/* Legendary Crashes Section */}
          <section id="legendary" className="scroll-mt-20">
            <div className="flex items-center justify-between border-b border-border-custom pb-4 mb-8">
              <div>
                <h3 className="font-heading font-black text-2xl text-negative tracking-tight">
                  📉 Legendary Crashes
                </h3>
                <p className="text-xs text-text-secondary mt-1">
                  Ride history&apos;s most devastating market failures... but try to stay alive.
                </p>
              </div>
              <span className="text-xs font-semibold text-negative border border-negative/20 bg-negative/5 px-2.5 py-1 rounded-full uppercase">
                High Risk
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {mockLegendaryCrashes.map((track) => (
                <TrackCard key={track.ticker} track={track} />
              ))}
            </div>
          </section>

        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

