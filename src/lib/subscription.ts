'use client';

import { Timestamp, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { Subscription } from '@/lib/types';

export function calcExpireDate(planId: Subscription['planId'], start: Date): Date {
  const d = new Date(start);
  switch (planId) {
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'quarterly':
      d.setMonth(d.getMonth() + 3);
      break;
    case 'semi_annually':
      d.setMonth(d.getMonth() + 6);
      break;
    case 'annually':
      d.setFullYear(d.getFullYear() + 1);
      break;
    default:
      d.setMonth(d.getMonth() + 1);
  }
  return d;
}

export async function activateSubscription(params: {
  firestore: Firestore;
  uid: string;
  planId: Subscription['planId'];
  paymentId: string;
}): Promise<void> {
  const { firestore, uid, planId, paymentId } = params;
  const start = new Date();
  const end = calcExpireDate(planId, start);

  const ref = doc(firestore, 'users', uid, 'subscription', 'current');
  await setDoc(ref, {
    userId: uid,
    planId,
    status: 'active',
    startDate: Timestamp.fromDate(start),
    endDate: Timestamp.fromDate(end),
    paymentProvider: 'wechat_pay',
    paymentId,
    createdAt: serverTimestamp(),
  }, { merge: true });
}