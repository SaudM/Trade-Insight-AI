/**
 * Firebase Admin SDK configuration for server-side operations.
 * This file handles the initialization of the Firebase Admin SDK,
 * which is used in API routes for tasks requiring elevated privileges.
 */

import { initializeApp, getApps, App, applicationDefault, getApp } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { firebaseConfig } from '@/firebase/config';

let adminApp: App;

/**
 * Initializes the Firebase Admin SDK idempotently.
 */
function initializeFirebaseAdmin() {
  if (!getApps().length) {
    console.log("Initializing Firebase Admin SDK...");
    try {
      // In production (e.g., App Hosting), ADC works out-of-the-box.
      // For local dev, `gcloud auth application-default login` is needed.
      adminApp = initializeApp({
        credential: applicationDefault(),
        projectId: process.env.GCLOUD_PROJECT || firebaseConfig.projectId,
      });
       console.log("Firebase Admin SDK initialized successfully with Application Default Credentials.");
    } catch (e: any) {
      console.warn(
        "Admin SDK initialization with ADC failed, falling back to default app instance. Error:",
        e.message
      );
      // Fallback for environments where ADC isn't set up but a default app might be available
      // This is less common but provides another layer of resilience.
       try {
        adminApp = initializeApp();
        console.log("Firebase Admin SDK initialized with default instance.");
       } catch (fallbackError: any) {
        console.error("CRITICAL: All Firebase Admin SDK initialization attempts failed.", fallbackError);
        throw new Error("Could not initialize Firebase Admin SDK.");
       }
    }
  } else {
    adminApp = getApp();
  }
}


// Initialize on module load
initializeFirebaseAdmin();

/**
 * Gets the initialized Admin Firestore instance.
 * @returns The Firestore instance.
 * @throws If the admin app is not initialized.
 */
export function getAdminFirestore(): Firestore {
  if (!adminApp) {
    throw new Error('Firebase Admin App not initialized. Cannot get Firestore.');
  }
  return getFirestore(adminApp);
}

/**
 * Gets the initialized Admin Auth instance.
 * @returns The Auth instance.
 * @throws If the admin app is not initialized.
 */
export function getAdminAuth() {
    if (!adminApp) {
        throw new Error('Firebase Admin App not initialized. Cannot get Auth.');
    }
    return getAuth(adminApp);
}
