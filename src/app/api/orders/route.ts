import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getAdminFirestore, getAdminInitializationError } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getUserIdFromSessionCookie() {
  try {
    const sessionCookie = cookies().get('__session')?.value;
    if (!sessionCookie) {
      return null;
    }
    const decodedClaims = await getAuth().verifySessionCookie(sessionCookie, true);
    return decodedClaims.uid;
  } catch (error) {
    console.warn('Could not verify session cookie:', error);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const db = getAdminFirestore();
  const initError = getAdminInitializationError();

  if (!db || initError) {
    console.error('Firebase Admin SDK not initialized correctly.', initError);
    return NextResponse.json({ error: 'Server configuration error: Firebase Admin not initialized.' }, { status: 503 });
  }
  
  // In App Hosting, the user's auth state is automatically provided.
  // In local dev, we check for a session cookie.
  let userId = req.headers.get('X-Firebase-Auth-UID');
  
  if (!userId) {
     userId = await getUserIdFromSessionCookie();
  }

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const ordersRef = db.collection('users').doc(userId).collection('orders');
    const snapshot = await ordersRef.orderBy('createdAt', 'desc').get();

    if (snapshot.empty) {
      return NextResponse.json({ orders: [] });
    }

    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    return NextResponse.json({ orders });

  } catch (error: any) {
    console.error(`Error fetching orders for user ${userId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch orders.' }, { status: 500 });
  }
}
