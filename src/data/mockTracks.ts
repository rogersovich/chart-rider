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
    changePercent: 75.0,
    difficulty: 'Insane',
    volatility: 3.8,
    assetType: 'stock',
    prices: [
      // Jun 2024 (21 days) — base building ~$180-209
      180, 182, 179, 183, 186, 185, 188, 191, 189, 193, 197, 195, 193, 198, 202, 200, 198, 204, 207, 205, 209,
      // Jul 2024 (23 days) — summer rally ~$212-256
      212, 215, 218, 222, 219, 225, 228, 232, 229, 235, 240, 238, 243, 248, 252, 248, 244, 241, 237, 242, 247, 251, 256,
      // Aug 2024 (22 days) — pullback & recovery ~$212-252
      252, 248, 242, 238, 232, 228, 224, 221, 218, 215, 212, 218, 222, 226, 230, 234, 228, 224, 220, 225, 229, 234,
      // Sep 2024 (20 days) — slow climb ~$238-271
      238, 242, 246, 250, 247, 252, 248, 244, 249, 254, 258, 255, 260, 257, 262, 267, 264, 261, 266, 271,
      // Oct 2024 (23 days) — pre-election momentum ~$261-295
      268, 264, 261, 265, 270, 274, 272, 269, 274, 280, 276, 272, 268, 273, 278, 284, 280, 276, 282, 288, 293, 290, 295,
      // Nov 2024 (21 days) — election night MEGA rally ~$295-410
      295, 312, 325, 338, 332, 345, 358, 365, 360, 372, 385, 379, 368, 380, 392, 386, 375, 388, 401, 396, 410,
      // Dec 2024 (22 days) — peak euphoria ~$418-482
      418, 424, 432, 428, 440, 448, 455, 460, 452, 445, 458, 470, 465, 475, 482, 478, 465, 458, 445, 438, 428, 421,
      // Jan 2025 (22 days) — choppy plateau ~$400-432
      415, 420, 428, 422, 415, 408, 400, 412, 420, 415, 408, 418, 425, 432, 428, 420, 412, 418, 424, 418, 410, 405,
      // Feb 2025 (20 days) — correction begins ~$288-385
      385, 372, 358, 348, 338, 325, 315, 308, 320, 332, 325, 312, 302, 295, 308, 320, 315, 308, 298, 288,
      // Mar 2025 (21 days) — bear market territory ~$245-278
      278, 268, 260, 252, 245, 258, 268, 275, 265, 258, 248, 255, 262, 270, 265, 258, 252, 260, 268, 275, 270,
      // Apr 2025 (20 days) — bottoming out ~$222-265
      265, 258, 248, 240, 232, 228, 235, 242, 248, 245, 238, 232, 228, 222, 228, 235, 242, 248, 255, 252,
      // May 2025 (17 days) — recovery rally ~$262-320
      262, 270, 278, 285, 292, 288, 295, 302, 298, 292, 285, 292, 300, 308, 315, 320, 315,
    ],
    dates: (() => {
      const result: string[] = [];
      const d = new Date('2024-06-03');
      while (result.length < 252) {
        if (d.getDay() !== 0 && d.getDay() !== 6) {
          result.push(d.toISOString().slice(0, 10));
        }
        d.setDate(d.getDate() + 1);
      }
      return result;
    })(),
    minPrice: 179,
    maxPrice: 482,
    startDate: '2024-06-03',
    endDate: '2025-05-30',
    description: 'Data harian nyata Tesla Jun 2024–Mei 2025. Nikmati rally election night November yang meroket ke $482, lalu koreksi brutal hingga $222 di April 2025!',
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

