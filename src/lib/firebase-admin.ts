/**
 * Firebase Admin SDK configuration for server-side operations.
 * This file handles the initialization of the Firebase Admin SDK,
 * which is used in API routes for tasks requiring elevated privileges.
 */

import { initializeApp, getApps, App, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { firebaseConfig } from '@/firebase/config';

let adminApp: App | null = null;
let adminFirestore: Firestore | null = null;
let initializationError: Error | null = null;

/**
 * Initializes the Firebase Admin SDK.
 * This function is designed to be robust for both production and local development.
 * It will only attempt to initialize once.
 * @returns An object containing the Firebase Admin App instance and the Firestore instance.
 */
function initializeFirebaseAdmin() {
  if (getApps().length === 0) {
    try {
      // In production environments (like App Hosting/Cloud Run), ADC will work automatically.
      // For local dev, `gcloud auth application-default login` is required.
      console.log("Attempting to initialize Firebase Admin SDK with Application Default Credentials...");
      adminApp = initializeApp({
        credential: applicationDefault(),
        projectId: process.env.GCLOUD_PROJECT || firebaseConfig.projectId,
      });
      adminFirestore = getFirestore(adminApp);
      console.log("Firebase Admin SDK initialized successfully with ADC.");
    } catch (e: any) {
      // This catch block is expected in local dev if ADC is not set up.
      initializationError = e;
      console.warn(
        "Firebase Admin SDK initialization with Application Default Credentials failed. " +
        "This is expected in some local development environments. " +
        "The API routes using the Admin SDK will not work until credentials are provided. " +
        "Original error:", e.message
      );
      // We set them to null so subsequent calls know initialization failed.
      adminApp = null;
      adminFirestore = null;
    }
  } else {
    adminApp = getApps()[0];
    adminFirestore = getFirestore(adminApp);
  }
}

// Initialize on first import.
initializeFirebaseAdmin();

/**
 * Gets the initialized Admin Firestore instance.
 * @returns The Firestore instance for server-side operations, or null if initialization failed.
 */
export function getAdminFirestore(): Firestore | null {
  return adminFirestore;
}

/**
 * Returns the error that occurred during Admin SDK initialization, if any.
 * @returns The initialization error or null.
 */
export function getAdminInitializationError(): Error | null {
  return initializationError;
}
