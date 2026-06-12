export interface Track {
  ticker: string;
  name: string;
  period: string;
  changePercent: number;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Insane';
  volatility: number; // Daily std dev %
  assetType: 'stock' | 'crypto';
  prices: number[]; // Array of numbers
  dates: string[]; // Corresponding dates
  minPrice: number;
  maxPrice: number;
  startDate: string;
  endDate: string;
  description?: string;
}

export interface GlobalStats {
  rides: number;
  virtualDollarsTraded: number;
  crashes: number;
}

export const mockGlobalStats: GlobalStats = {
  rides: 9054,
  virtualDollarsTraded: 32410500,
  crashes: 64120,
};

export const mockTracks: Track[] = [
  {
    ticker: 'TSLA',
    name: 'Tesla Motors Inc.',
    period: '1Y',
    changePercent: 22.3,
    difficulty: 'Hard',
    volatility: 3.8,
    assetType: 'stock',
    prices: [150, 155, 148, 162, 170, 165, 158, 175, 188, 180, 195, 210, 202, 198, 220, 235, 228, 245, 260, 250, 240, 255, 270, 265, 258, 272, 285, 278, 290, 310, 302, 320, 340, 332, 325, 345, 360, 352, 368, 385, 372, 390, 410, 398, 415, 430, 422, 440, 455, 445],
    dates: Array.from({ length: 50 }, (_, i) => `2025-${String(Math.floor(i/4)+1).padStart(2, '0')}-${String((i%4)*7+1).padStart(2, '0')}`),
    minPrice: 148,
    maxPrice: 455,
    startDate: '2025-06-01',
    endDate: '2026-06-01',
    description: 'Rally Tesla yang legendaris dengan akselerasi tanjakan terjal dan beberapa koreksi tajam. Sempurna untuk melakukan lompatan tinggi!',
  },
  {
    ticker: 'BTC',
    name: 'Bitcoin',
    period: '1Y',
    changePercent: -12.4,
    difficulty: 'Medium',
    volatility: 2.5,
    assetType: 'crypto',
    prices: [68000, 69200, 67500, 66000, 64200, 65500, 63000, 62100, 63500, 64800, 62000, 59500, 58000, 60200, 59100, 57500, 55000, 56800, 58200, 57000, 59500, 61200, 60000, 58500, 59200, 61000, 62500, 61500, 63000, 64500, 63800, 62000, 60500, 59000, 57200, 58900, 59800, 58500, 57000, 56200, 55100, 56800, 57900, 58500, 59200, 60500, 59500, 58200, 59100, 59500],
    dates: Array.from({ length: 50 }, (_, i) => `2025-${String(Math.floor(i/4)+1).padStart(2, '0')}-${String((i%4)*7+1).padStart(2, '0')}`),
    minPrice: 55000,
    maxPrice: 69200,
    startDate: '2025-06-01',
    endDate: '2026-06-01',
    description: 'Trek crypto dengan pola wave berulang. Waspadai penurunan mendadak setelah area konsolidasi.',
  },
  {
    ticker: 'GME',
    name: 'GameStop Corp.',
    period: '1Y',
    changePercent: 84.5,
    difficulty: 'Hard',
    volatility: 5.2,
    assetType: 'stock',
    prices: [15, 16, 15.5, 14.8, 17, 18.5, 16, 15.2, 14.5, 19, 24, 38, 64, 82, 95, 120, 145, 92, 68, 55, 48, 38, 42, 35, 30, 28, 26, 25, 24.2, 23.5, 25, 27, 26.5, 28.2, 29, 28.5, 27.2, 26, 26.8, 27.5, 29, 28.2, 27.8, 28.5, 29.2, 28, 27.5, 28.2, 27, 27.6],
    dates: Array.from({ length: 50 }, (_, i) => `2025-${String(Math.floor(i/4)+1).padStart(2, '0')}-${String((i%4)*7+1).padStart(2, '0')}`),
    minPrice: 14.5,
    maxPrice: 145,
    startDate: '2025-06-01',
    endDate: '2026-06-01',
    description: 'Satu tanjakan luar biasa tinggi yang menyerupai roket ke bulan, diikuti penurunan vertikal yang mematikan bagi rider lambat!',
  },
  {
    ticker: 'SPY',
    name: 'S&P 500 ETF',
    period: '1Y',
    changePercent: 12.3,
    difficulty: 'Easy',
    volatility: 0.8,
    assetType: 'stock',
    prices: [510, 512, 511, 513, 515, 517, 516, 518, 520, 522, 521, 523, 525, 527, 526, 528, 530, 532, 531, 533, 535, 537, 536, 538, 540, 542, 541, 543, 545, 547, 546, 548, 550, 552, 551, 553, 555, 557, 556, 558, 560, 562, 561, 563, 565, 567, 566, 568, 570, 572],
    dates: Array.from({ length: 50 }, (_, i) => `2025-${String(Math.floor(i/4)+1).padStart(2, '0')}-${String((i%4)*7+1).padStart(2, '0')}`),
    minPrice: 510,
    maxPrice: 572,
    startDate: '2025-06-01',
    endDate: '2026-06-01',
    description: 'Sangat halus dengan kemiringan konstan ke atas. Sempurna untuk pemula yang ingin belajar menyeimbangkan motor.',
  }
];

export const mockLegendaryCrashes: Track[] = [
  {
    ticker: 'ENRN',
    name: 'Enron Corporation',
    period: 'ALL',
    changePercent: -99.8,
    difficulty: 'Insane',
    volatility: 12.4,
    assetType: 'stock',
    prices: [85, 87, 86, 89, 90, 88, 85, 83, 80, 82, 75, 78, 62, 55, 48, 52, 45, 38, 36, 39, 30, 22, 15, 18, 12, 9, 7, 4.5, 2.1, 1.2, 0.8, 0.5, 0.3, 0.15, 0.12, 0.1, 0.08, 0.06, 0.05, 0.04, 0.03, 0.02, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01],
    dates: Array.from({ length: 50 }, (_, i) => `2001-${String(Math.floor(i/4)+1).padStart(2, '0')}-${String((i%4)*7+1).padStart(2, '0')}`),
    minPrice: 0.01,
    maxPrice: 90,
    startDate: '2001-01-01',
    endDate: '2001-12-01',
    description: 'Simbol skandal korporasi terbesar abad ini. Trek dimulai di atas awan sebelum runtuh secara dramatis ke kerak bumi.',
  },
  {
    ticker: 'LEH',
    name: 'Lehman Brothers Holdings',
    period: 'ALL',
    changePercent: -99.9,
    difficulty: 'Insane',
    volatility: 15.6,
    assetType: 'stock',
    prices: [65, 68, 66, 62, 58, 60, 54, 52, 48, 50, 42, 38, 32, 35, 30, 26, 22, 25, 21, 18, 14, 16, 12, 9, 8, 14, 7.5, 5.2, 3.8, 4.2, 3.1, 1.8, 0.9, 0.4, 0.2, 0.12, 0.08, 0.05, 0.03, 0.02, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01],
    dates: Array.from({ length: 50 }, (_, i) => `2008-${String(Math.floor(i/4)+1).padStart(2, '0')}-${String((i%4)*7+1).padStart(2, '0')}`),
    minPrice: 0.01,
    maxPrice: 68,
    startDate: '2008-01-01',
    endDate: '2008-11-01',
    description: 'Pemicu Krisis Finansial Global 2008. Trek penuh volatilitas yang berujung pada jurang tak berdasar.',
  },
  {
    ticker: 'WCOM',
    name: 'WorldCom Inc.',
    period: 'ALL',
    changePercent: -98.2,
    difficulty: 'Insane',
    volatility: 11.2,
    assetType: 'stock',
    prices: [45, 48, 46, 49, 52, 50, 48, 44, 42, 43, 38, 35, 32, 34, 28, 25, 22, 24, 18, 15, 12, 14, 9.8, 7.5, 6.2, 8.0, 5.5, 4.2, 3.1, 3.5, 2.4, 1.8, 1.2, 1.5, 0.9, 0.6, 0.45, 0.5, 0.32, 0.22, 0.18, 0.2, 0.15, 0.11, 0.08, 0.05, 0.04, 0.03, 0.02, 0.02],
    dates: Array.from({ length: 50 }, (_, i) => `2002-${String(Math.floor(i/4)+1).padStart(2, '0')}-${String((i%4)*7+1).padStart(2, '0')}`),
    minPrice: 0.02,
    maxPrice: 52,
    startDate: '2002-01-01',
    endDate: '2002-09-01',
    description: 'Kombinasi dataran tinggi yang menipu sebelum terjadi penurunan curam akibat koreksi akuntansi besar-besaran.',
  }
];

export const mockDailyChallenge = {
  track: mockTracks[0], // TSLA
  bestScore: 166062,
  bestPlayer: 'pallit_oy',
  totalRiders: 187,
  leaderboardMini: [
    { rank: 1, player: 'pallit_oy', score: 166062, time: '1:23.4', crashes: 1 },
    { rank: 2, player: 'trader_x', score: 142300, time: '1:18.9', crashes: 3 },
    { rank: 3, player: 'moonrider', score: 138500, time: '1:31.2', crashes: 2 },
    { rank: 4, player: 'chart_fan', score: 121400, time: '1:42.5', crashes: 0 },
    { rank: 5, player: 'hodler_99', score: 98450, time: '1:55.1', crashes: 5 },
  ],
};

/**
 * Returns all available tracks: regular mock tracks + legendary crashes.
 * Used to look up any ticker (including those coming from the daily-challenge API).
 */
export function getAllTracks(): Track[] {
  return [...mockTracks, ...mockLegendaryCrashes];
}

