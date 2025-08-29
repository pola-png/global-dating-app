
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, firestore } from '@/lib/firebase';
import { doc, onSnapshot, collection, query, where, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { IncomingCall } from '@/components/chat/IncomingCall';
import { useRouter } from 'next/navigation';

export interface Call {
  id: string;
  caller: User;
  callee: User;
  chatId: string;
  status: 'ringing' | 'answered' | 'declined' | 'ended';
  offer: RTCSessionDescriptionInit;
}

type CallContextType = {
  incomingCall: Call | null;
  activeCall: Call | null;
  setActiveCall: (call: Call | null) => void;
  answerCall: () => Promise<void>;
  declineCall: () => Promise<void>;
};

const CallContext = createContext<CallContextType | undefined>(undefined);

export function CallProvider({ children }: { children: ReactNode }) {
  const [currentUser] = useAuthState(auth);
  const router = useRouter();
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);

  useEffect(() => {
    let unsubscribe: () => void;

    if (currentUser?.uid) {
      const callsRef = collection(firestore, 'calls');
      const q = query(
        callsRef,
        where('callee.uid', '==', currentUser.uid),
        where('status', '==', 'ringing')
      );

      unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const callDoc = snapshot.docs[0];
          const callData = callDoc.data() as Omit<Call, 'id'>;
          setIncomingCall({ id: callDoc.id, ...callData });
        } else {
          setIncomingCall(null);
        }
      }, (error) => {
        console.error("Error listening for incoming calls:", error);
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser?.uid]);

  const answerCall = useCallback(async () => {
    if (!incomingCall) return;

    try {
        const callDocRef = doc(firestore, 'calls', incomingCall.id);
        await updateDoc(callDocRef, { status: 'answered' });
        
        setActiveCall(incomingCall);
        setIncomingCall(null);
        
        router.push(`/chat/${incomingCall.chatId}?video=true`);
    } catch(error) {
        console.error("Error answering call: ", error);
    }
  }, [incomingCall, router]);

  const declineCall = useCallback(async () => {
    if (!incomingCall) return;
    try {
        const callDocRef = doc(firestore, 'calls', incomingCall.id);
        await updateDoc(callDocRef, { status: 'declined' });
        setIncomingCall(null);
    } catch(error) {
        console.error("Error declining call: ", error);
    }
  }, [incomingCall]);

  // Clean up declined or ended calls
  useEffect(() => {
      if (!currentUser?.uid) return;

      const callDocRef = activeCall ? doc(firestore, 'calls', activeCall.id) : null;
      if (!callDocRef) return;
      
      const unsubscribe = onSnapshot(callDocRef, async (snapshot) => {
          const data = snapshot.data();
          if (!snapshot.exists() || data?.status === 'ended' || data?.status === 'declined') {
              if (activeCall) {
                  const callDoc = await getDoc(doc(firestore, 'calls', activeCall.id));
                  if(callDoc.exists()) await deleteDoc(doc(firestore, 'calls', activeCall.id));
                  setActiveCall(null);
              }
          }
      });
      return () => unsubscribe();
  }, [activeCall, currentUser?.uid]);

  return (
    <CallContext.Provider value={{ incomingCall, activeCall, setActiveCall, answerCall, declineCall }}>
      {children}
      {incomingCall && <IncomingCall />}
    </CallContext.Provider>
  );
}

export function useCall() {
  const context = useContext(CallContext);
  if (context === undefined) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
}
