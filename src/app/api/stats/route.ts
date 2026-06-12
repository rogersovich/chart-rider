import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/stats — global counters from Supabase
export async function GET() {
  if (!supabase) {
    return NextResponse.json({
      total_rides: 9_054,
      total_crashes: 64_318,
      virtual_traded: 32_000_000,
      offline: true,
    });
  }

  // Total rides = total score rows
  const { count: totalRides } = await supabase
    .from('scores')
    .select('*', { count: 'exact', head: true });

  // Total crashes = sum of crashes column
  const { data: crashData } = await supabase
    .from('scores')
    .select('crashes');

  const totalCrashes = (crashData ?? []).reduce((sum, r) => sum + (r.crashes ?? 0), 0);

  // Virtual $ traded: score * 1000 (conceptual "dollars" per point)
  const { data: scoreData } = await supabase
    .from('scores')
    .select('score');

  const virtualTraded = (scoreData ?? []).reduce((sum, r) => sum + (r.score ?? 0), 0) * 1000;

  return NextResponse.json({
    total_rides: totalRides ?? 0,
    total_crashes: totalCrashes,
    virtual_traded: virtualTraded,
    offline: false,
  });
}
