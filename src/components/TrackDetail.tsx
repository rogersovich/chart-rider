'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Track } from '@/data/mockTracks';
import { calculateVolatility, getDifficulty, smoothPrices, simplifyPricesRDP, getNormalizedCoordinates } from '@/lib/chartUtils';

interface TrackDetailProps {
  track: Track;
}

type Period = '3M' | '6M' | '1Y' | 'ALL';

export default function TrackDetail({ track }: TrackDetailProps) {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('1Y');
  const [isSmoothed, setIsSmoothed] = useState(false);

  // Dynamically slice the price array and recalculate metrics
  const slicedData = useMemo(() => {
    const isCrypto = track.assetType === 'crypto';
    let slicePoints = track.prices.length;

    if (period === '3M') slicePoints = isCrypto ? 90 : 63;
    else if (period === '6M') slicePoints = isCrypto ? 180 : 126;
    else if (period === '1Y') slicePoints = isCrypto ? 365 : 252;

    const pricesSlice = track.prices.slice(-slicePoints);
    const datesSlice = track.dates.slice(-slicePoints);

    // Calculate percent change for this specific period
    const firstPrice = pricesSlice[0] || 0;
    const lastPrice = pricesSlice[pricesSlice.length - 1] || 0;
    const periodChangePercent = firstPrice > 0 
      ? Number((((lastPrice - firstPrice) / firstPrice) * 100).toFixed(2)) 
      : 0;

    // Standard deviation volatility index of this period (unsmoothed returns represent true volatility)
    const periodVolatility = calculateVolatility(pricesSlice);
    const periodDifficulty = getDifficulty(periodVolatility);

    // Apply smoothing if active
    const processedPrices = isSmoothed ? simplifyPricesRDP(pricesSlice, 0.045) : pricesSlice;

    return {
      prices: processedPrices,
      rawPrices: pricesSlice,
      dates: datesSlice,
      changePercent: periodChangePercent,
      volatility: periodVolatility,
      difficulty: periodDifficulty,
      minPrice: Math.min(...processedPrices),
      maxPrice: Math.max(...processedPrices),
      startDate: datesSlice[0] || track.startDate,
      endDate: datesSlice[datesSlice.length - 1] || track.endDate,
    };
  }, [track, period, isSmoothed]);

  const svgWidth = 800;
  const svgHeight = 300;
  const paddingY = 30;
  const paddingX = 20;

  // Generate SVG coordinates for rendering
  const coordinates = useMemo(() => {
    return getNormalizedCoordinates(slicedData.prices, svgWidth, svgHeight, paddingY, paddingX);
  }, [slicedData.prices, svgWidth, svgHeight]);

  const pathData = useMemo(() => {
    if (coordinates.length === 0) return '';
    return `M ${coordinates.map(c => `${c.x},${c.y}`).join(' L ')}`;
  }, [coordinates]);

  const fillPathData = useMemo(() => {
    if (coordinates.length === 0) return '';
    return `${pathData} L ${svgWidth - paddingX},${svgHeight - paddingY} L ${paddingX},${svgHeight - paddingY} Z`;
  }, [pathData, coordinates, svgWidth, svgHeight]);

  const isPositive = slicedData.changePercent >= 0;

  const difficultyColors = (diff: string) => {
    switch (diff) {
      case 'Easy': return 'bg-accent-glow text-accent border-accent/20';
      case 'Medium': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'Hard': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'Insane': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-surface border-border-custom text-text-secondary';
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Back Button */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary mb-6 transition-colors group"
      >
        <span className="transform group-hover:-translate-x-0.5 transition-transform">←</span> Kembali ke Dashboard
      </Link>

      {/* Main Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-border-custom pb-8 mb-8 transition-colors">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-text-muted px-2 py-0.5 rounded bg-surface border border-border-custom uppercase font-semibold">
              {track.assetType}
            </span>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${difficultyColors(slicedData.difficulty)}`}>
              {slicedData.difficulty}
            </span>
          </div>
          <h1 className="font-heading font-black text-4xl text-text-primary tracking-tight">
            {track.ticker} <span className="font-medium text-2xl text-text-secondary ml-2">{track.name}</span>
          </h1>
          <p className="text-sm text-text-secondary mt-1.5 max-w-xl leading-relaxed">
            {track.description || 'Medan berkendara yang disimulasikan menggunakan data grafik pasar keuangan nyata.'}
          </p>
        </div>

        <div className="flex flex-col items-start md:items-end">
          <span className="text-xs text-text-muted">Perubahan Periode ({period})</span>
          <span className={`text-4xl font-heading font-black tracking-tight ${isPositive ? 'text-positive' : 'text-negative'}`}>
            {isPositive ? '+' : ''}{slicedData.changePercent}%
          </span>
          <span className="text-xs text-text-secondary mt-0.5">
            Volatilitas Harian: <strong className="text-text-primary">{slicedData.volatility}%</strong>
          </span>
        </div>
      </div>

      {/* Interactive Controls & Settings */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface border border-border-custom p-4 rounded-xl shadow-sm mb-6 transition-colors">
        {/* Period Selector */}
        <div className="flex items-center gap-1 bg-background p-1 border border-border-custom rounded-lg">
          {(['3M', '6M', '1Y', 'ALL'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded text-xs font-semibold tracking-wider transition-all cursor-pointer ${
                period === p
                  ? 'bg-accent text-black font-extrabold shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Smoothing Toggle */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-text-secondary">Haluskan Kurva</span>
          <button
            onClick={() => setIsSmoothed(!isSmoothed)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-accent/40 ${
              isSmoothed ? 'bg-accent' : 'bg-border-custom dark:bg-neutral-800'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isSmoothed ? 'translate-x-6 bg-black' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Main SVG Track Canvas */}
      <div className="relative border border-border-custom bg-surface rounded-2xl p-6 shadow-md transition-colors overflow-hidden mb-8">
        <div className="absolute top-4 left-6 text-xs font-semibold text-text-muted flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          PRATINJAU TREK MOTOCROSS
        </div>

        {/* Top/Bottom scale markers */}
        <div className="absolute top-12 right-6 text-[10px] text-text-muted font-mono">
          Maks: ${slicedData.maxPrice}
        </div>
        <div className="absolute bottom-12 right-6 text-[10px] text-text-muted font-mono">
          Min: ${slicedData.minPrice}
        </div>

        {/* Chart Canvas */}
        <div className="relative w-full h-[320px] bg-background/50 border border-border-custom/50 rounded-xl p-3 flex items-center justify-center overflow-hidden">
          {/* Grid lines background */}
          <div className="absolute inset-0 flex flex-col justify-between p-8 opacity-10 pointer-events-none">
            <div className="h-px w-full bg-text-primary" />
            <div className="h-px w-full bg-text-primary" />
            <div className="h-px w-full bg-text-primary" />
            <div className="h-px w-full bg-text-primary" />
          </div>

          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className={`w-full h-full ${
              isPositive 
                ? 'text-positive drop-shadow-[0_0_8px_rgba(5,150,105,0.15)] dark:drop-shadow-[0_0_8px_rgba(61,255,160,0.15)]' 
                : 'text-negative drop-shadow-[0_0_8px_rgba(220,38,38,0.15)] dark:drop-shadow-[0_0_8px_rgba(255,77,77,0.15)]'
            }`}
            preserveAspectRatio="none"
          >
            {/* Gradient fill */}
            <path
              d={fillPathData}
              fill="url(#area-gradient)"
              className="opacity-[0.08] dark:opacity-[0.05]"
            />
            {/* Main outline line */}
            <path
              d={pathData}
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-colors duration-300"
            />
            
            {/* Start & Finish markers */}
            {coordinates.length > 0 && (
              <>
                {/* Start Marker */}
                <circle cx={coordinates[0].x} cy={coordinates[0].y} r="6" fill="#3DFFA0" stroke="white" strokeWidth="2" />
                {/* Finish Marker */}
                <circle cx={coordinates[coordinates.length - 1].x} cy={coordinates[coordinates.length - 1].y} r="6" fill="#FF4D4D" stroke="white" strokeWidth="2" />
              </>
            )}

            <defs>
              <linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>

          {/* Text Labels */}
          <div className="absolute bottom-2.5 left-5 text-[10px] font-bold text-accent tracking-wider flex items-center gap-1 uppercase">
            <span>🏁</span> Start ({slicedData.startDate})
          </div>
          <div className="absolute bottom-2.5 right-5 text-[10px] font-bold text-negative tracking-wider flex items-center gap-1 uppercase">
            Finish ({slicedData.endDate}) <span>🏁</span>
          </div>
        </div>
      </div>

      {/* Bottom Layout - Stats & CTA Action */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
        {/* Statistics breakdown */}
        <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-border-custom bg-surface/50 transition-colors">
            <p className="text-[10px] text-text-secondary uppercase font-semibold">Tingkat Kesulitan</p>
            <p className="font-heading font-black text-lg text-text-primary mt-1">{slicedData.difficulty}</p>
          </div>
          <div className="p-4 rounded-xl border border-border-custom bg-surface/50 transition-colors">
            <p className="text-[10px] text-text-secondary uppercase font-semibold">Estimasi Skor Maksimal</p>
            <p className="font-heading font-black text-lg text-accent mt-1">
              {new Intl.NumberFormat('en-US').format(Math.round(slicedData.prices.length * 100) + 2000)} pts
            </p>
          </div>
          <div className="p-4 rounded-xl border border-border-custom bg-surface/50 transition-colors col-span-2 sm:col-span-1">
            <p className="text-[10px] text-text-secondary uppercase font-semibold">Jumlah Titik Medan</p>
            <p className="font-heading font-black text-lg text-text-primary mt-1">{slicedData.prices.length} Titik</p>
          </div>
        </div>

        {/* CTA Launch Game */}
        <div className="md:col-span-5 flex flex-col justify-center">
          <button
            onClick={() => {
              const smoothParam = isSmoothed ? '&smooth=true' : '';
              router.push(`/${track.ticker}/ride?period=${period}${smoothParam}`);
            }}
            className="w-full py-5 px-6 rounded-xl font-heading font-extrabold text-lg text-center bg-accent text-black hover:bg-accent-hover active:scale-95 transition-all duration-300 shadow-md shadow-accent-glow hover:shadow-lg flex items-center justify-center gap-2.5 cursor-pointer"
          >
            🏍️ Mulai Berkendara (Ride Track)
          </button>
        </div>
      </div>
    </div>
  );
}
