'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { mockTracks, mockLegendaryCrashes } from '@/data/mockTracks';

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Combine mock data for searching
  const allTracks = [...mockTracks, ...mockLegendaryCrashes];

  // Filter suggestions
  const suggestions = query
    ? allTracks.filter(
        (t) =>
          t.ticker.toLowerCase().includes(query.toLowerCase()) ||
          t.name.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (searchTerm: string) => {
    setError(null);
    setIsOpen(false);

    const match = allTracks.find((t) => t.ticker.toUpperCase() === searchTerm.trim().toUpperCase());
    
    if (match) {
      setQuery(match.ticker);
      router.push(`/${match.ticker}`);
    } else {
      setError('Track not available');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 mb-16 relative" ref={dropdownRef}>
      <h3 className="font-heading font-bold text-sm text-text-secondary mb-3 uppercase tracking-wider text-center">
        🔍 Search Stock or Crypto Track
      </h3>
      
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch(query);
        }}
        className="relative flex items-center gap-2"
      >
        <div className="relative flex-grow">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setError(null);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Search ticker (e.g. TSLA, BTC, GME, ENRN...)"
            className="w-full px-5 py-3.5 pr-10 rounded-xl border border-border-custom bg-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all duration-200 text-base shadow-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setError(null);
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary focus:outline-none text-lg p-0.5"
            >
              ✕
            </button>
          )}
        </div>
        
        <button
          type="submit"
          className="px-6 py-3.5 rounded-xl font-heading font-extrabold bg-surface border border-border-custom text-text-primary hover:bg-surface-hover hover:border-text-secondary active:scale-95 transition-all duration-200 cursor-pointer shadow-sm flex items-center gap-2"
        >
          Ride
        </button>

        {/* Autocomplete Dropdown */}
        {isOpen && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 z-30 max-h-60 overflow-y-auto rounded-xl border border-border-custom bg-surface shadow-2xl divide-y divide-border-custom/40 backdrop-blur-md">
            {suggestions.map((track) => (
              <button
                key={track.ticker}
                type="button"
                onClick={() => handleSearch(track.ticker)}
                className="w-full px-5 py-3 text-left hover:bg-surface-hover transition-colors duration-150 flex items-center justify-between group"
              >
                <div>
                  <span className="font-heading font-bold text-text-primary group-hover:text-accent transition-colors duration-150">
                    {track.ticker}
                  </span>
                  <span className="text-xs text-text-secondary ml-3">{track.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase border font-semibold ${
                    track.difficulty === 'Easy' ? 'bg-accent-glow text-accent border-accent/20' :
                    track.difficulty === 'Medium' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                    track.difficulty === 'Hard' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                    'bg-red-500/10 text-red-500 border-red-500/20'
                  }`}>
                    {track.difficulty}
                  </span>
                  <span className="text-[10px] text-text-muted capitalize">{track.assetType}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </form>

      {/* Validation Message Banners */}
      {error && (
        <div className="mt-3.5 p-3.5 rounded-xl border border-negative/20 bg-negative/5 text-negative text-sm text-center font-medium animate-fadeIn flex items-center justify-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}
    </div>
  );
}
