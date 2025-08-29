
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, MessageCircle, User, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnreadCount } from '@/context/UnreadCountContext';
import { Badge } from '@/components/ui/badge';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, firestore } from '@/lib/firebase';
import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import type { User as AppUser } from '@/lib/types';


const navItems = [
  { href: '/home', icon: Home, label: 'Home' },
  { href: '/groups', icon: Users, label: 'Groups' },
  { href: '/chat', icon: MessageCircle, label: 'Chat' },
  { href: '/profile', icon: User, label: 'Profile' },
  { href: '/vip', icon: Star, label: 'VIP' },
];

export function BottomNavBar() {
  const pathname = usePathname();
  const { totalUnread, setTotalUnread, unreadGroupCount, setUnreadGroupCount } = useUnreadCount();
  const [currentUser] = useAuthState(auth);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Listener for private chat unread counts
  useEffect(() => {
    if (currentUser && currentUser.uid) {
      const chatsRef = collection(firestore, 'privateChats');
      const q = query(chatsRef, where('participants', 'array-contains', currentUser.uid));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        let totalUnreadMessages = 0;
        snapshot.forEach(doc => {
            const chatData = doc.data();
            const unreadCount = chatData.participantDetails?.[currentUser.uid]?.unreadCount || 0;
            totalUnreadMessages += unreadCount;
        });
        setTotalUnread(totalUnreadMessages);
      }, (error) => {
        console.error("Error fetching unread counts for private chats: ", error);
      });

      return () => unsubscribe();
    } else {
        setTotalUnread(0);
    }
  }, [currentUser, setTotalUnread]);

  // Listener for group chat unread counts
  useEffect(() => {
    if (!currentUser || !currentUser.uid) {
      setUnreadGroupCount(0);
      return;
    }
  
    let unsubscribeUser: () => void = () => {};
    let unsubscribeGroups: () => void = () => {};
  
    const userDocRef = doc(firestore, 'users', currentUser.uid);
  
    unsubscribeUser = onSnapshot(userDocRef, (userSnap) => {
      const userData = userSnap.data() as AppUser | undefined;
      const groupsLastViewed = userData?.groupsLastViewed || {};
  
      // Now query groups where user is a member
      const groupsQuery = query(collection(firestore, 'groupMetadata'), where('members', 'array-contains', currentUser.uid));
      
      unsubscribeGroups = onSnapshot(groupsQuery, (groupsSnap) => {
        let count = 0;
        groupsSnap.forEach((groupDoc) => {
          const groupData = groupDoc.data();
          const lastViewedTimestamp = groupsLastViewed[groupData.slug]?.toDate();
          const lastMessageTimestamp = groupData.lastMessageTimestamp?.toDate();

          if (lastMessageTimestamp && (!lastViewedTimestamp || lastMessageTimestamp > lastViewedTimestamp)) {
            count++;
          }
        });
        setUnreadGroupCount(count);
      }, (error) => {
        console.error("Error fetching unread group counts:", error);
      });

    }, (error) => {
      console.error("Error fetching user data for group counts:", error);
    });
  
    return () => {
      unsubscribeUser();
      unsubscribeGroups();
    };
  }, [currentUser, setUnreadGroupCount]);


  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around">
        {navItems.map((item) => {
          const isActive = (item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)) &&
                         (item.href !== '/profile' || pathname === `/profile/${currentUser?.uid}` || pathname === '/profile');
          if (item.href === '/profile' && !pathname.startsWith('/profile')) {
            // Special handling for the main profile link
          }


          const getBadgeCount = () => {
            if (item.label === 'Chat') return totalUnread;
            if (item.label === 'Groups') return unreadGroupCount;
            return 0;
          };
          const badgeCount = getBadgeCount();
          let linkHref = item.href;
          if(isClient && item.href === '/profile') {
            linkHref = `/profile/${currentUser?.uid || ''}`;
          }


          return (
            <Link
              key={item.href}
              href={linkHref}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 rounded-md p-2 text-muted-foreground transition-colors hover:text-primary',
                isActive && 'text-primary'
              )}
            >
              <item.icon className={cn('h-6 w-6', isActive && 'fill-current')} />
              <span className="text-xs font-medium">{item.label}</span>
              {badgeCount > 0 && (
                 <Badge variant="destructive" className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full p-0 text-xs">
                    {badgeCount > 9 ? '9+' : badgeCount}
                </Badge>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
