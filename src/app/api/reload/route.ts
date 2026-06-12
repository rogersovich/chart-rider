import { NextResponse } from 'next/server';
import { reloadCache } from '@/lib/dataStore';

export async function GET() {
  try {
    reloadCache();
    return NextResponse.json({ success: true, message: 'Cache reloaded successfully.' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    reloadCache();
    return NextResponse.json({ success: true, message: 'Cache reloaded successfully.' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
