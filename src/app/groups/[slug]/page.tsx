
'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, X, Lock } from 'lucide-react';
import type { GroupMessage, User } from '@/lib/types';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, firestore } from '@/lib/firebase';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, arrayUnion, getDoc, setDoc, increment } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import Link from 'next/link';
import { countryCodes } from '@/lib/country-codes';


export default function GroupChatPage() {
  const [currentUser, authLoading] = useAuthState(auth);
  const router = useRouter();
  const params = useParams();
  const groupSlug = params.slug as string;

  const [groupName, setGroupName] = useState('');
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [pageLoading, setPageLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<GroupMessage | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/');
    }
  }, [currentUser, authLoading, router]);

  useLayoutEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  });

  useEffect(() => {
    if (currentUser?.uid && groupSlug) {
        const name = `Meet partners in ${groupSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`;
        setGroupName(name);

        const messagesRef = collection(firestore, 'groupChats', groupSlug, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));
  
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const msgs = snapshot.docs.map(doc => {
              const data = doc.data();
              const timestamp = data.timestamp?.toDate ? data.timestamp.toDate() : new Date();
              return {
                  id: doc.id,
                  ...data,
                  timestamp: format(timestamp, 'p'),
                  isOwn: data.sender.uid === currentUser.uid,
              } as GroupMessage;
          });
          setMessages(msgs);
          setPageLoading(false);
        }, () => {
          setPageLoading(false);
        });

        const userDocRef = doc(firestore, 'users', currentUser.uid);
        updateDoc(userDocRef, {
            [`groupsLastViewed.${groupSlug}`]: serverTimestamp()
        }).catch(console.error);
  
        return () => unsubscribe();
      }
  }, [currentUser?.uid, groupSlug]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !currentUser?.uid) return;
  
    // --- FIX START: Join group logic moved before sending message ---
    const groupMetadataRef = doc(firestore, 'groupMetadata', groupSlug);
    const userDocRef = doc(firestore, 'users', currentUser.uid);
    let hasJustJoined = false;
  
    // Check if user has joined this group before
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists() && !userDoc.data().joinedGroups?.includes(groupSlug)) {
        hasJustJoined = true;
    }
  
    const countryName = groupName.replace('Meet partners in ', '');
    const countryInfo = countryCodes.find(c => c.name === countryName);
  
    const metadataUpdate: any = { 
        lastMessageText: newMessage,
        lastMessageTimestamp: serverTimestamp(),
        name: groupName,
        slug: groupSlug,
        country: countryName,
        countryCode: countryInfo?.code || null,
    };
  
    if (hasJustJoined) {
        metadataUpdate.members = arrayUnion(currentUser.uid);
        metadataUpdate.memberCount = increment(1);
    }
  
    // Update metadata first to ensure user has permissions to write messages
    await setDoc(groupMetadataRef, metadataUpdate, { merge: true });
    
    if (hasJustJoined) {
        await updateDoc(userDocRef, {
            joinedGroups: arrayUnion(groupSlug)
        });
    }
    // --- FIX END ---
  
    const messageData: any = {
      text: newMessage,
      sender: {
        uid: currentUser.uid,
        fullName: currentUser.displayName,
        avatarUrl: currentUser.photoURL,
      },
      timestamp: serverTimestamp(),
    };
    
    if (replyTo) {
        messageData.replyTo = {
          id: replyTo.id,
          text: replyTo.text,
          senderName: replyTo.sender.fullName,
        };
    }
  
    setNewMessage('');
    setReplyTo(null);
  
    // Now send the message, after permissions are guaranteed
    await addDoc(collection(firestore, 'groupChats', groupSlug, 'messages'), messageData);
  };
  
  const handleReply = (message: GroupMessage) => {
    setReplyTo(message);
  }

  const handleStartPrivateChat = (otherUserId: string) => {
    if (currentUser?.uid && otherUserId) {
        const chatId = [currentUser.uid, otherUserId].sort().join('_');
        router.push(`/chat/${chatId}`);
    }
  }

  if (authLoading || pageLoading || !currentUser) {
    return (
      <MainLayout>
        <div className="flex h-screen flex-col mx-auto max-w-2xl bg-black">
           <header className="flex items-center gap-4 border-b bg-card p-4 shrink-0">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
            </div>
          </header>
          <div className="flex-1 space-y-4 p-4 overflow-y-auto">
            <Skeleton className="h-16 w-3/4 rounded-lg bg-gray-700" />
            <Skeleton className="h-16 w-3/4 rounded-lg ml-auto bg-gray-700" />
            <Skeleton className="h-10 w-1/2 rounded-lg bg-gray-700" />
            <Skeleton className="h-16 w-3/4 rounded-lg ml-auto bg-gray-700" />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex h-screen flex-col mx-auto max-w-2xl">
        <header className="flex shrink-0 items-center gap-4 border-b bg-card p-2">
          <Button variant="ghost" size="icon" onClick={() => router.push('/groups')}>
            <ArrowLeft />
          </Button>
          <div>
            <h2 className="font-semibold">{groupName}</h2>
             <div className="flex items-center gap-1">
                <Lock className="h-3 w-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">End-to-end encrypted</p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-gray-900">
          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex flex-col", msg.isOwn ? 'items-end' : 'items-start')}>
              <div className="group relative">
                  <div onDoubleClick={() => handleReply(msg)} className={cn('flex items-end gap-2', msg.isOwn ? 'justify-end' : 'justify-start')}>
                      {!msg.isOwn && (
                        <Link href={`/profile/${msg.sender.uid}`}>
                            <Avatar className="h-8 w-8 cursor-pointer">
                                <AvatarImage src={msg.sender.avatarUrl} alt={msg.sender.fullName || ''} />
                                <AvatarFallback>{msg.sender.fullName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                        </Link>
                      )}
                      <div className={cn('max-w-xs md:max-w-md rounded-lg p-3', msg.isOwn ? 'bg-primary text-primary-foreground' : 'bg-gray-700 text-white')}>
                        {!msg.isOwn && (
                           <Link href={`/profile/${msg.sender.uid}`}>
                            <p className="text-sm font-bold mb-1 hover:underline">{msg.sender.fullName}</p>
                           </Link>
                        )}
                        {msg.replyTo && (              
                            <div className="text-xs border-l-2 border-primary/50 pl-2 mb-1 opacity-80 bg-black/20 p-2 rounded-md">
                                <p className="font-semibold">{msg.replyTo.senderName}</p>
                                <p className="truncate">{msg.replyTo.text}</p>
                            </div>
                        )}
                        <p className="text-lg font-semibold">{msg.text}</p>
                        <p className="text-xs opacity-70 mt-1 text-right">{msg.timestamp}</p>
                      </div>
                  </div>
              </div>
            </div>
            )
          )}
          <div ref={messagesEndRef} />
        </div>

        <footer className="sticky bottom-0 border-t bg-card">
          {replyTo && (
                <div className="p-2 flex items-center justify-between rounded-lg bg-muted text-sm">
                    <div>
                        <p className="font-semibold">Replying to {replyTo.sender.fullName}</p>
                        <p className="truncate text-muted-foreground">{replyTo.text}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setReplyTo(null)}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}
          <form onSubmit={handleSendMessage} className="flex items-center gap-2 p-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
            />
            <Button type="submit" size="icon">
              <Send />
            </Button>
          </form>
        </footer>
      </div>
    </MainLayout>
  );
}
