import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Returns null if env vars are not set (graceful degradation)
export function getSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// ── Types ────────────────────────────────────────────────────────────────────

export interface ScoreRow {
  id: string;
  ticker: string;
  period: string;
  username: string;
  score: number;
  time_secs: number;
  crashes: number;
  distance_percent: number;
  created_at: string;
}

export interface DailyChallengeRow {
  id: string;
  challenge_date: string;
  ticker: string;
  period: string;
}
