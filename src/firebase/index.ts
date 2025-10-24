'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!firebaseConfig.apiKey) {
    console.error('Firebase configuration is missing. Please check your firebase config.');
    return {
      firebaseApp: null,
      auth: null,
    };
  }

  if (!getApps().length) {
    // Important! initializeApp() is called without any arguments because Firebase App Hosting
    // integrates with the initializeApp() function to provide the environment variables needed to
    // populate the FirebaseOptions in production. It is critical that we attempt to call initializeApp()
    // without arguments.
    let firebaseApp;
    
    // Check if we're in a Firebase App Hosting environment
    const isFirebaseHosting = process.env.FIREBASE_CONFIG || process.env.GCLOUD_PROJECT;
    
    if (isFirebaseHosting) {
      try {
        // Attempt to initialize via Firebase App Hosting environment variables
        firebaseApp = initializeApp();
        console.log('Firebase initialized successfully via App Hosting environment variables.');
      } catch (e) {
        console.warn('Firebase App Hosting initialization failed. Falling back to config object.', e);
        firebaseApp = initializeApp(firebaseConfig);
      }
    } else {
      // In development or non-Firebase hosting environments, use the config directly
      try {
        firebaseApp = initializeApp(firebaseConfig);
        if (process.env.NODE_ENV === 'development') {
          console.log('Firebase initialized successfully with config object (development mode).');
        }
      } catch (e) {
        console.error('Firebase initialization failed:', e);
        throw e;
      }
    }

    return getSdks(firebaseApp);
  }

  // If already initialized, return the SDKs with the already initialized App
  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
  };
}

export * from './provider';
export * from './client-provider';
export * from './non-blocking-login';
