'use client';

import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: 'global-dating-chat',
  appId: '1:832138420938:web:fecc2d42cf58404fee4a33',
  storageBucket: 'global-dating-chat.firebasestorage.app',
  apiKey: 'AIzaSyA-K31RFSrWNTJlBl6JjmWIsXBtxJ1ZSFY',
  authDomain: 'global-dating-chat.firebaseapp.com',
  measurementId: '',
  messagingSenderId: '832138420938',
};

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
}

const auth = getAuth(app);
const firestore = getFirestore(app);

export { auth, firestore };
