
'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, Paperclip, X, Check, CheckCheck, Lock, Video } from 'lucide-react';
import type { Message, User, MessageStatus } from '@/lib/types';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, firestore } from '@/lib/firebase';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { doc, getDoc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, writeBatch, setDoc, updateDoc, increment, Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import Link from 'next/link';
import { VideoCall } from '@/components/chat/VideoCall';

const MessageStatusIndicator = ({ status }: { status: MessageStatus }) => {
    if (status === 'sent') {
      return <Check className="h-4 w-4" />;
    }
    if (status === 'delivered') {
      return <CheckCheck className="h-4 w-4" />;
    }
    if (status === 'read') {
      return <CheckCheck className="h-4 w-4 text-green-500" />;
    }
    return null;
};

export default function ChatPage() {
  const [currentUser, authLoading] = useAuthState(auth);
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const chatId = params.chatId as string;
  const startVideo = searchParams.get('video') === 'true';

  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [pageLoading, setPageLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showVideoCall, setShowVideoCall] = useState(startVideo);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/');
    }
  }, [currentUser, authLoading, router]);
  
   useEffect(() => {
    if (startVideo) {
      setShowVideoCall(true);
    }
  }, [startVideo]);

  useLayoutEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  });


  useEffect(() => {
    if (!currentUser?.uid || !chatId) return;

    const userIds = chatId.split('_');
    const otherUserId = userIds.find(id => id !== currentUser.uid);

    if (otherUserId) {
      const fetchOtherUser = async () => {
        const userDoc = await getDoc(doc(firestore, 'users', otherUserId));
        if (userDoc.exists()) {
          setOtherUser(userDoc.data() as User);
        }
      };
      fetchOtherUser();
    }
    
    const messagesRef = collection(firestore, 'privateChats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const msgs = snapshot.docs.map(doc => {
          const data = doc.data();
          let timestamp;
          if (data.timestamp instanceof Timestamp) {
              timestamp = data.timestamp.toDate();
          } else if (data.timestamp?.seconds) {
              timestamp = new Timestamp(data.timestamp.seconds, data.timestamp.nanoseconds).toDate();
          } else {
              timestamp = new Date();
          }
          
          return {
              id: doc.id,
              ...data,
              timestamp: format(timestamp, 'p'),
              isOwn: data.sender.uid === currentUser.uid,
              status: data.status || 'sent',
          } as Message;
      });

      setMessages(msgs);
      
      if (pageLoading) {
          setPageLoading(false);
      }

      const batch = writeBatch(firestore);
      let hasUnread = false;

      snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.sender.uid !== currentUser.uid && data.status !== 'read') {
              batch.update(doc.ref, { status: 'read' });
              hasUnread = true;
          } else if (data.sender.uid === currentUser.uid && data.status === 'sent') {
               batch.update(doc.ref, { status: 'delivered' });
          }
      });
      
      if (hasUnread) {
          const privateChatRef = doc(firestore, 'privateChats', chatId);
          await updateDoc(privateChatRef, {
              [`participantDetails.${currentUser.uid}.unreadCount`]: 0
          }).catch(console.error);
      }
      
      if (!batch.isEmpty) {
        await batch.commit().catch(console.error);
      }
    }, (error) => {
        console.error("Error in snapshot listener:", error);
    });

    return () => unsubscribe();
    
  }, [currentUser?.uid, chatId, pageLoading]);
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if(newMessage.trim() === '' || !currentUser || !otherUser) return;
    
    const messageText = newMessage;
    const participants = [currentUser.uid, otherUser.uid].sort();
    const chatDocId = participants.join('_');

    const messageData: any = {
      text: messageText,
      sender: {
          uid: currentUser.uid,
          fullName: currentUser.displayName,
          avatarUrl: currentUser.photoURL
      },
      timestamp: serverTimestamp(),
      status: 'sent',
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

    await addDoc(collection(firestore, 'privateChats', chatDocId, 'messages'), messageData);
    
    const privateChatRef = doc(firestore, 'privateChats', chatDocId);
    
    try {
      // Step 1: Ensure the document and participant details exist with non-counter fields.
      await setDoc(privateChatRef, {
          lastMessageText: messageText,
          lastMessageTimestamp: serverTimestamp(),
          participants: participants,
          participantDetails: {
            [currentUser.uid]: {
              fullName: currentUser.displayName,
              avatarUrl: currentUser.photoURL,
            },
            [otherUser.uid]: {
              fullName: otherUser.fullName,
              avatarUrl: otherUser.avatarUrl,
            }
          }
      }, { merge: true });

      // Step 2: Reliably update counter fields.
      await updateDoc(privateChatRef, {
        [`participantDetails.${otherUser.uid}.unreadCount`]: increment(1),
        [`participantDetails.${currentUser.uid}.unreadCount`]: 0 // Ensure sender's count is 0
      });

    } catch (error) {
        console.error("Error updating private chat metadata:", error);
    }
  };

  const handleReply = (message: Message) => {
    setReplyTo(message);
  }
  
  const handleCloseVideo = () => {
    setShowVideoCall(false);
    // Remove the query param from the URL without reloading the page
    const newUrl = `/chat/${chatId}`;
    window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
  };

  if (authLoading || pageLoading || !currentUser || !otherUser) {
    return (
      <MainLayout>
        <div className="flex h-screen flex-col mx-auto max-w-2xl">
           <header className="flex items-center gap-4 border-b bg-card p-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className='space-y-2'>
                    <Skeleton className="h-5 w-24" />
                </div>
            </header>
            <div className="flex-1 space-y-4 p-4">
                <Skeleton className="h-16 w-3/4 rounded-lg" />
                <Skeleton className="h-16 w-3/4 rounded-lg ml-auto" />
                <Skeleton className="h-10 w-1/2 rounded-lg" />
                 <Skeleton className="h-16 w-3/4 rounded-lg ml-auto" />
            </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex h-screen flex-col mx-auto max-w-2xl">
        <header className="flex shrink-0 items-center border-b bg-card">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft />
            </Button>
            <Link href={`/profile/${otherUser.uid}`} className="flex items-center gap-2 hover:bg-muted/50 p-1 rounded-lg transition-colors flex-1">
                <Avatar>
                    <AvatarImage src={otherUser.avatarUrl} alt={otherUser.fullName} data-ai-hint="person" />
                    <AvatarFallback>{otherUser.fullName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                    <h2 className="font-semibold">{otherUser.fullName}</h2>
                    <div className="flex items-center gap-1">
                        <Lock className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">End-to-end encrypted</p>
                    </div>
                </div>
            </Link>
             <Button variant="ghost" size="icon" onClick={() => setShowVideoCall(true)}>
                <Video />
            </Button>
        </header>

        <div className="flex-1 overflow-y-auto space-y-4 p-4">
          {messages.map((msg) => (
             <div key={msg.id} className="group relative">
                <div onDoubleClick={() => handleReply(msg)} className={cn("flex items-end gap-2", msg.isOwn ? "justify-end" : "justify-start")}>
                    {!msg.isOwn && <Avatar className="h-8 w-8"><AvatarImage src={msg.sender.avatarUrl} /><AvatarFallback>{msg.sender.fullName?.charAt(0)}</AvatarFallback></Avatar>}
                    <div className={cn("max-w-xs md:max-w-md rounded-lg p-2", msg.isOwn ? "bg-primary text-primary-foreground" : "bg-muted")}>
                        <p className="text-xs font-bold mb-1">{msg.sender.fullName}</p>
                        {msg.replyTo && (
                            <div className="text-xs border-l-2 border-primary/50 pl-2 mb-1 opacity-80 bg-black/10 p-2 rounded-md">
                                <p className="font-semibold">{msg.replyTo.senderName}</p>
                                <p className="truncate">{msg.replyTo.text}</p>
                            </div>
                        )}
                        <div className="flex items-end gap-2">
                           <p className="text-base whitespace-pre-wrap mr-2">{msg.text}</p>
                            <div className="flex-shrink-0 flex items-center gap-1">
                                <p className="text-xs opacity-70">{msg.timestamp}</p>
                                {msg.isOwn && <MessageStatusIndicator status={msg.status} />}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg cursor-pointer" onDoubleClick={() => handleReply(msg)}>
                    Double-tap to reply
                </div>
             </div>
          ))}
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
                <Button variant="ghost" size="icon"><Paperclip /></Button>
                <Input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1" />
                <Button type="submit" size="icon"><Send /></Button>
            </form>
        </footer>
      </div>
      {currentUser && otherUser && showVideoCall && (
        <VideoCall 
          chatId={chatId}
          currentUser={currentUser}
          otherUser={otherUser}
          onClose={handleCloseVideo}
          startWithVideo={startVideo}
        />
      )}
    </MainLayout>
  );
}
