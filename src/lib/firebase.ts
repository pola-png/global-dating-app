
'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

if (!firebaseApiKey) {
  throw new Error('Firebase API key is not set in the environment variables. Please add NEXT_PUBLIC_FIREBASE_API_KEY to your .env file');
}

const firebaseConfig = {
  projectId: 'global-dating-chat',
  appId: '1:832138420938:web:fecc2d42cf58404fee4a33',
  storageBucket: 'global-dating-chat.firebasestorage.app',
  apiKey: firebaseApiKey,
  authDomain: 'global-dating-chat.firebaseapp.com',
  measurementId: '',
  messagingSenderId: '832138420938',
};

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const firestore = getFirestore(app);

export { auth, firestore };
