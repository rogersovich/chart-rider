import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Prevents Next.js from caching this route as static
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Verify Vercel Cron authorization header if CRON_SECRET is set
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (!supabase) {
    return NextResponse.json(
      { success: false, error: 'Supabase client not initialized' },
      { status: 500 }
    );
  }

  try {
    // Perform a simple query to wake up/keep the database alive
    const { data, error } = await supabase.from('scores').select('id').limit(1);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Supabase keep-alive ping successful',
      timestamp: new Date().toISOString(),
      dataCount: data?.length ?? 0,
    });
  } catch (error: any) {
    console.error('Error during Supabase keep-alive cron:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
