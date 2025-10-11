'use client';

import { ProfileView } from '@/components/app/profile-view';
import { useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import type { Subscription } from '@/lib/types';
import { doc, Timestamp } from 'firebase/firestore';
import { useMemo } from 'react';

export default function ProfilePage() {
  const { user, firestore } = useFirebase();

  const subscriptionRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid, 'subscription', 'current') : null),
    [user, firestore]
  );
  const { data: subscription } = useDoc<Subscription>(subscriptionRef);

  const isProUser = useMemo(() => {
    if (!user) return false;
    if (subscription) {
      const now = new Date();
      const endDate = (subscription.endDate as Timestamp).toDate();
      return subscription.status === 'active' && endDate > now;
    }
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const userCreationDate = user.metadata.creationTime ? new Date(user.metadata.creationTime) : new Date();
    return userCreationDate > thirtyDaysAgo;
  }, [subscription, user]);

  return <ProfileView isProUser={isProUser} subscription={subscription} />;
}
