import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GAME_CONSTANTS } from '@/lib/gameConstants';

// ── In-memory rate limiter (per IP, max 5 submits/min) ───────────────────────
const rateLimitMap = new Map<string, { count: number; reset: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.reset) {
    rateLimitMap.set(ip, { count: 1, reset: now + 60_000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

// ── Username sanitizer ────────────────────────────────────────────────────────
function sanitizeUsername(raw: string): string | null {
  const cleaned = raw
    .trim()
    .replace(/[^a-zA-Z0-9_\-.]/g, '') // only alphanumeric + _ - .
    .slice(0, 20);
  if (cleaned.length < 2) return null;
  return cleaned;
}

// ── Anti-cheat plausibility ───────────────────────────────────────────────────
// Theoretical max score given distance% and duration (generous 1.5× buffer)
function computeTheoreticalMax(distancePercent: number, timeSecs: number): number {
  const distancePts = (distancePercent / 100) * GAME_CONSTANTS.MAX_DISTANCE_POINTS
    * GAME_CONSTANTS.NITRO_DISTANCE_MULTIPLIER; // best case all nitro
  const airPts = GAME_CONSTANTS.AIR_POINTS_PER_SEC * timeSecs; // best case all airborne
  const finishBonus = GAME_CONSTANTS.FINISH_BONUS_POINTS;
  return Math.round((distancePts + airPts + finishBonus) * 1.5); // 50% buffer
}

// ── POST handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded. Wait a minute.' }, { status: 429 });
  }

  let body: {
    ticker: string;
    period: string;
    username: string;
    score: number;
    time_secs: number;
    crashes: number;
    distance_percent: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { ticker, period, score, time_secs, crashes, distance_percent } = body;

  // Validate required fields
  if (!ticker || !period || typeof score !== 'number' || typeof time_secs !== 'number') {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
  }

  const username = sanitizeUsername(body.username ?? '');
  if (!username) {
    return NextResponse.json({ error: 'Username must be 2–20 alphanumeric characters.' }, { status: 400 });
  }

  // Anti-cheat plausibility check
  const maxPossible = computeTheoreticalMax(
    Math.min(100, Math.max(0, distance_percent)),
    Math.max(1, time_secs)
  );
  if (score > maxPossible) {
    return NextResponse.json({ error: 'Score rejected: implausible for the given run.' }, { status: 422 });
  }

  if (!supabase) {
    // Supabase not configured — accept gracefully, no persistence
    return NextResponse.json({ rank: null, message: 'Leaderboard offline (no Supabase config).' });
  }

  // Insert score
  const { error: insertError } = await supabase.from('scores').insert({
    ticker: ticker.toUpperCase().slice(0, 12),
    period,
    username,
    score,
    time_secs,
    crashes: Math.max(0, crashes),
    distance_percent: Math.min(100, Math.max(0, distance_percent)),
  });

  if (insertError) {
    console.error('Supabase insert error:', insertError);
    return NextResponse.json({ error: 'Failed to save score.' }, { status: 500 });
  }

  // Compute rank: count scores today that are strictly higher
  const today = new Date().toISOString().slice(0, 10);
  const { count } = await supabase
    .from('scores')
    .select('*', { count: 'exact', head: true })
    .eq('ticker', ticker.toUpperCase())
    .eq('period', period)
    .gte('created_at', `${today}T00:00:00Z`)
    .gt('score', score);

  const rank = (count ?? 0) + 1;

  return NextResponse.json({ rank, username });
}
