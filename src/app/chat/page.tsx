
'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, MessageCircle } from 'lucide-react';
import type { Chat, User } from '@/lib/types';
import Link from 'next/link';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, firestore } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';

export default function ChatListPage() {
  const [currentUser, loading] = useAuthState(auth);
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatsLoading, setChatsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push('/');
    }
  }, [currentUser, loading, router]);

  useEffect(() => {
    if (currentUser?.uid) {
      setChatsLoading(true);
      const chatsRef = collection(firestore, 'privateChats');
      const q = query(chatsRef, where('participants', 'array-contains', currentUser.uid), orderBy('lastMessageTimestamp', 'desc'));

      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const fetchedChatsPromises = snapshot.docs.map(async (docSnapshot) => {
          const chatData = docSnapshot.data();
          const participantDetails = chatData.participantDetails || {};
          const otherUserId = Object.keys(participantDetails).find(id => id !== currentUser.uid);

          const lastMessageTimestamp = chatData.lastMessageTimestamp?.toDate ? chatData.lastMessageTimestamp.toDate() : new Date(0);
          
          let otherUser: User | null = null;
          if (otherUserId) {
              const userDetails = participantDetails[otherUserId];
              if (userDetails && userDetails.fullName) {
                   otherUser = {
                      uid: otherUserId,
                      fullName: userDetails.fullName,
                      avatarUrl: userDetails.avatarUrl,
                      age: 0, city: '', country: '', gender: 'prefer-not-to-say', about: '', relationshipType: 'Not sure', relationshipStatus: 'Single',
                  };
              } else {
                  // Fallback to fetching from users collection if details are missing
                  const userDoc = await getDoc(doc(firestore, 'users', otherUserId));
                  if (userDoc.exists()) {
                      const userData = userDoc.data() as User;
                      otherUser = {
                          ...userData,
                          uid: otherUserId,
                      };
                  }
              }
          }
          
          if (!otherUser) {
              return null; // Skip this chat if other user can't be determined
          }
          
          const unreadCount = participantDetails[currentUser.uid]?.unreadCount || 0;

          return {
            id: docSnapshot.id,
            user: otherUser,
            lastMessage: chatData.lastMessageText || 'No messages yet',
            timestamp: lastMessageTimestamp.getTime() > 0 ? formatDistanceToNow(lastMessageTimestamp, { addSuffix: true }) : 'Never',
            unreadCount: unreadCount,
          };
        });
        
        const fetchedChats = (await Promise.all(fetchedChatsPromises)).filter(chat => chat !== null) as Chat[];
        
        setChats(fetchedChats);
        setChatsLoading(false);
      }, (error) => {
        console.error("Error fetching private chats: ", error);
        setChatsLoading(false);
      });

      return () => {
        unsubscribe();
      };
    }
  }, [currentUser?.uid]);

  if (loading || !currentUser) {
    return (
      <MainLayout>
        <div className="container mx-auto max-w-2xl px-4 py-6">
          <Skeleton className="h-12 w-1/3 mb-6" />
          <Skeleton className="h-10 w-full mb-6" />
          <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto max-w-2xl px-4 py-6">
        <header className="mb-6">
          <h1 className="font-headline text-4xl font-bold">Chats</h1>
          <p className="text-muted-foreground">Your private conversations.</p>
        </header>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input placeholder="Search chats..." className="pl-10" />
        </div>
        
        <div className="space-y-2">
          {chatsLoading ? (
             <div className="space-y-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
          ) : chats.length > 0 ? (
            chats.map((chat) => (
              <Link href={`/chat/${chat.id}`} key={chat.id} className="block">
                <div className="flex items-center gap-4 rounded-lg p-3 transition-colors hover:bg-card">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={chat.user.avatarUrl} alt={chat.user.fullName} data-ai-hint="person" />
                    <AvatarFallback>{chat.user.fullName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <h3 className="truncate font-semibold">{chat.user.fullName}</h3>
                    <p className="truncate text-sm text-muted-foreground">{chat.lastMessage}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                    <span>{chat.timestamp}</span>
                    {chat.unreadCount > 0 && (
                      <Badge variant="default" className="flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs">
                        {chat.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
                <MessageCircle className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-xl font-semibold">No chats yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                    Start a conversation with someone to see it here.
                </p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
