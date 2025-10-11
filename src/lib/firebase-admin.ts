/**
 * Firebase Admin SDK configuration for server-side operations.
 * This file handles the initialization of the Firebase Admin SDK,
 * which is used in API routes for tasks requiring elevated privileges.
 */

import { initializeApp, getApps, App, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { firebaseConfig } from '@/firebase/config';

let adminApp: App | null = null;
let adminFirestore: Firestore | null = null;

/**
 * Initializes the Firebase Admin SDK.
 * This function is designed to be robust for both production and local development.
 * @returns An object containing the Firebase Admin App instance and the Firestore instance.
 */
function initializeFirebaseAdmin() {
  // If already initialized, return the existing instances to avoid re-initialization.
  if (adminApp && adminFirestore) {
    return { adminApp, adminFirestore };
  }

  try {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      adminApp = existingApps[0];
    } else {
        const projectId = firebaseConfig?.projectId || process.env.GCLOUD_PROJECT;
        // In production environments (like Firebase App Hosting, Cloud Run),
        // this will use the environment's automatically provided credentials.
        // For local development, you must have run `gcloud auth application-default login`.
        if (!projectId) {
            throw new Error("Failed to initialize Firebase Admin: Project ID is missing.");
        }
        adminApp = initializeApp({
            credential: applicationDefault(),
            projectId: projectId,
        });
    }

    // Get the Firestore instance.
    adminFirestore = getFirestore(adminApp);
    
    return { adminApp, adminFirestore };
  } catch (error) {
    console.error('Firebase Admin SDK initialization failed:', error);
    // This is a critical error, so we re-throw to make it visible.
    throw new Error('Firebase Admin SDK initialization failed');
  }
}

/**
 * Gets the initialized Admin Firestore instance.
 * @returns The Firestore instance for server-side operations.
 */
export function getAdminFirestore(): Firestore {
  // Initialize on first call.
  if (!adminFirestore) {
    const { adminFirestore: firestore } = initializeFirebaseAdmin();
    return firestore;
  }
  return adminFirestore;
}
