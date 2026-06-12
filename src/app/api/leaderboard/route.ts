import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/leaderboard?ticker=TSLA&period=1Y&date=2026-06-12
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ticker = (searchParams.get('ticker') ?? 'TSLA').toUpperCase();
  const period = searchParams.get('period') ?? '1Y';

  // Default date = today WIB (UTC+7)
  const rawDate = searchParams.get('date');
  const wibOffset = 7 * 60 * 60 * 1000;
  const todayWIB = new Date(Date.now() + wibOffset).toISOString().slice(0, 10);
  const date = rawDate ?? todayWIB;

  if (!supabase) {
    return NextResponse.json({ scores: [], offline: true });
  }

  const { data, error } = await supabase
    .from('scores')
    .select('id, username, score, time_secs, crashes, distance_percent, created_at')
    .eq('ticker', ticker)
    .eq('period', period)
    .gte('created_at', `${date}T00:00:00+00:00`)
    .lt('created_at', `${date}T23:59:59+00:00`)
    .order('score', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Leaderboard query error:', error);
    return NextResponse.json({ scores: [], error: error.message }, { status: 500 });
  }

  return NextResponse.json({ scores: data ?? [], date, ticker, period });
}
