// This API route is no longer used.
// Order data is now fetched directly on the client-side using a secure collection query.
// This file is kept to avoid breaking any potential references but it does not perform any action.

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ orders: [], message: 'This endpoint is deprecated.' });
}
