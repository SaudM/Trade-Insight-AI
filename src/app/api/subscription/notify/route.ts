import { NextRequest } from 'next/server';

// Minimal notify stub. In production, verify signature and update order status.
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // TODO: verify signature & decrypt resource per WeChat Pay v3 spec
    // For simplicity, acknowledge receipt so WeChat stops retrying.
    console.log('subscription/notify payload:', body);
    return Response.json({ code: 'SUCCESS', message: 'OK' });
  } catch (err: any) {
    console.error('subscription/notify error:', err);
    return new Response(JSON.stringify({ code: 'FAIL', message: err.message || 'error' }), { status: 500 });
  }
}
