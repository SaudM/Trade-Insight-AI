import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import type { Order } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function verifyToken(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    return decodedToken.uid;
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = await verifyToken(req);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized. Please log in again.' }, { status: 401 });
    }

    const firestore = getAdminFirestore();
    if (!firestore) {
      return NextResponse.json({ error: 'Firebase Admin not configured on the server.' }, { status: 503 });
    }

    const ordersRef = firestore.collection('users').doc(userId).collection('orders');
    const snapshot = await ordersRef.orderBy('createdAt', 'desc').get();

    if (snapshot.empty) {
      return NextResponse.json({ orders: [] });
    }

    const orders = snapshot.docs.map(doc => {
      const data = doc.data() as Order;
      // Convert Firestore Timestamps to ISO strings for JSON serialization
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate().toISOString(),
        paidAt: data.paidAt?.toDate().toISOString(),
        updatedAt: data.updatedAt?.toDate().toISOString(),
      };
    });

    return NextResponse.json({ orders });

  } catch (err: any) {
    console.error('Error fetching orders:', err);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
