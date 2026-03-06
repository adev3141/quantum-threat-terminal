import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function getFirebaseConfigError(): string | null {
  const missing = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length === 0) {
    return null;
  }

  return `Missing Firebase public env vars: ${missing.join(', ')}`;
}

export function getFirebaseAppInstance(): FirebaseApp | null {
  if (getFirebaseConfigError()) {
    return null;
  }

  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig as Record<string, string>);
}

export function getFirestoreInstance() {
  const app = getFirebaseAppInstance();
  return app ? getFirestore(app) : null;
}
