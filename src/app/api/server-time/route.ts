import { NextResponse } from 'next/server';
import { getEgyptDateParts } from '@/lib/user-utils';

export const dynamic = 'force-dynamic';

// The single source of "now" for the UI — device clocks are never trusted.
export async function GET() {
  const now = new Date();
  const { isoDate, monthKey } = getEgyptDateParts(now);
  return NextResponse.json(
    { now: now.toISOString(), isoDate, monthKey },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
