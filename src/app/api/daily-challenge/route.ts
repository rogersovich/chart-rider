import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Curated fallback rotation (used when table is empty or Supabase is offline)
const FALLBACK_CHALLENGES = [
  { ticker: 'TSLA', period: '1Y' },
  { ticker: 'GME',  period: '1Y' },
  { ticker: 'AAPL', period: '1Y' },
  { ticker: 'BTC',  period: '1Y' },
  { ticker: 'NVDA', period: '1Y' },
  { ticker: 'AMZN', period: '1Y' },
  { ticker: 'MSFT', period: '6M' },
  { ticker: 'ETH',  period: '1Y' },
];

// GET /api/daily-challenge
export async function GET() {
  // Today in WIB (UTC+7)
  const wibOffset = 7 * 60 * 60 * 1000;
  const todayWIB = new Date(Date.now() + wibOffset).toISOString().slice(0, 10);

  if (supabase) {
    const { data, error } = await supabase
      .from('daily_challenge')
      .select('ticker, period, challenge_date')
      .eq('challenge_date', todayWIB)
      .single();

    if (!error && data) {
      return NextResponse.json({ ticker: data.ticker, period: data.period, date: todayWIB, source: 'supabase' });
    }
  }

  // Deterministic daily fallback: pick from rotation by day-of-year
  const dayOfYear = Math.floor(
    (Date.now() + wibOffset - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000
  );
  const challenge = FALLBACK_CHALLENGES[dayOfYear % FALLBACK_CHALLENGES.length];
  return NextResponse.json({ ...challenge, date: todayWIB, source: 'fallback' });
}
