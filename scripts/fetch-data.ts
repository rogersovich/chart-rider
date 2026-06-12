import fs from 'fs';
import path from 'path';

// Define the Track interface
interface Track {
  ticker: string;
  name: string;
  period: string;
  changePercent: number;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Insane';
  volatility: number;
  assetType: 'stock' | 'crypto';
  prices: number[];
  dates: string[];
  minPrice: number;
  maxPrice: number;
  startDate: string;
  endDate: string;
  description?: string;
}

const TRACK_CONFIGS = [
  { ticker: 'TSLA', querySymbol: 'TSLA', name: 'Tesla, Inc.', type: 'stock' as const, desc: 'Rally Tesla yang legendaris dengan akselerasi tanjakan terjal dan koreksi tajam.' },
  { ticker: 'GME', querySymbol: 'GME', name: 'GameStop Corp.', type: 'stock' as const, desc: 'Satu tanjakan luar biasa tinggi yang menyerupai roket ke bulan, diikuti penurunan vertikal.' },
  { ticker: 'SPY', querySymbol: 'SPY', name: 'S&P 500 ETF', type: 'stock' as const, desc: 'Sangat halus dengan kemiringan konstan ke atas. Sempurna untuk latihan pemula.' },
  { ticker: 'AAPL', querySymbol: 'AAPL', name: 'Apple Inc.', type: 'stock' as const, desc: 'Trek stabil dengan tanjakan teknologi yang konsisten dan volatilitas sedang.' },
  { ticker: 'BTC', querySymbol: 'BTC-USD', name: 'Bitcoin', type: 'crypto' as const, desc: 'Trek crypto dengan pola wave berulang dan jurang-jurang volatil.' },
  { ticker: 'ETH', querySymbol: 'ETH-USD', name: 'Ethereum', type: 'crypto' as const, desc: 'Medan crypto dengan tanjakan smart-contract yang menantang.' }
];

function calculateVolatility(prices: number[]): number {
  if (prices.length < 2) return 0;
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const prev = prices[i - 1];
    const curr = prices[i];
    if (prev > 0) {
      returns.push((curr - prev) / prev);
    }
  }
  if (returns.length === 0) return 0;
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance) * 100;
  return Number(stdDev.toFixed(2));
}

function getDifficulty(volatility: number): 'Easy' | 'Medium' | 'Hard' | 'Insane' {
  if (volatility < 1.2) return 'Easy';
  if (volatility < 2.5) return 'Medium';
  if (volatility < 5.0) return 'Hard';
  return 'Insane';
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchChart(
  ticker: string,
  querySymbol: string,
  name: string,
  assetType: 'stock' | 'crypto',
  description: string
): Promise<Track | null> {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${querySymbol}?range=2y&interval=1d`;
  console.log(`Fetching ${assetType} data for ${ticker} (${querySymbol}) from Yahoo Finance...`);
  
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) {
      throw new Error('Invalid JSON structure returned from Yahoo Finance');
    }

    const timestamps: number[] = result.timestamp || [];
    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close || [];
    
    const validPrices: number[] = [];
    const validDates: string[] = [];

    for (let i = 0; i < timestamps.length; i++) {
      if (timestamps[i] != null && closes[i] != null) {
        const dateStr = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
        validPrices.push(Number(closes[i]!.toFixed(2)));
        validDates.push(dateStr);
      }
    }

    if (validPrices.length === 0) {
      throw new Error(`No valid closing price data available for ${ticker}`);
    }

    const firstPrice = validPrices[0];
    const lastPrice = validPrices[validPrices.length - 1];
    const changePercent = Number((((lastPrice - firstPrice) / firstPrice) * 100).toFixed(2));
    const volatility = calculateVolatility(validPrices);
    const difficulty = getDifficulty(volatility);

    return {
      ticker,
      name,
      period: 'ALL',
      changePercent,
      difficulty,
      volatility,
      assetType,
      prices: validPrices,
      dates: validDates,
      minPrice: Math.min(...validPrices),
      maxPrice: Math.max(...validPrices),
      startDate: validDates[0],
      endDate: validDates[validDates.length - 1],
      description
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to fetch chart for ${ticker}:`, msg);
    return null;
  }
}

async function main() {
  const targetDir = path.join(process.cwd(), 'src/data');
  const targetFile = path.join(targetDir, 'tracks.json');
  const tempFile = path.join(targetDir, 'tracks.json.tmp');

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Load existing cache if available
  let existingData: Record<string, Track> = {};
  if (fs.existsSync(targetFile)) {
    try {
      const raw = fs.readFileSync(targetFile, 'utf8');
      existingData = JSON.parse(raw);
      console.log(`Loaded ${Object.keys(existingData).length} existing tracks from cache.`);
    } catch {
      console.warn('Failed to parse existing tracks file, starting fresh.');
    }
  }

  const updatedData: Record<string, Track> = { ...existingData };

  // Fetch all configured assets
  for (const config of TRACK_CONFIGS) {
    const track = await fetchChart(
      config.ticker,
      config.querySymbol,
      config.name,
      config.type,
      config.desc
    );
    
    if (track) {
      updatedData[config.ticker] = track;
    } else if (existingData[config.ticker]) {
      console.log(`⚠️ Keeping cached data for failed asset ${config.ticker}`);
    }
    
    await delay(1500); // 1.5 second polite delay between requests
  }

  if (Object.keys(updatedData).length === 0) {
    console.error('❌ Error: No track data was successfully fetched. Aborting save.');
    process.exit(1);
  }

  // Write atomically
  try {
    fs.writeFileSync(tempFile, JSON.stringify(updatedData, null, 2), 'utf8');
    fs.renameSync(tempFile, targetFile);
    console.log(`\n✅ Successfully updated data. Saved ${Object.keys(updatedData).length} tracks to ${targetFile}\n`);
    
    // Attempt reload ping if app is running locally (silent if it fails)
    try {
      await fetch('http://localhost:3000/api/reload', { method: 'POST' });
      console.log('🔄 Triggered cache reload on active local server.');
    } catch {
      // Server is likely not running, ignore
    }
  } catch (error) {
    console.error('❌ Failed to write track data atomically:', error);
    process.exit(1);
  }
}

main();

