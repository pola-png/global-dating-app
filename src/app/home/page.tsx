
'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { CreatePost } from '@/components/home/CreatePost';
import { PostCard } from '@/components/home/PostCard';
import type { Post, User } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { useEffect, useState, useCallback } from 'react';
import { collection, onSnapshot, query, orderBy, doc, getDoc, getDocs, limit } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, firestore } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, LogOut, Home as HomeIcon, Users, MessageCircle, User as UserIcon, Star, Shield } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


export default function HomePage() {
  const [currentUser, authLoading] = useAuthState(auth);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [postIds, setPostIds] = useState<string[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const router = useRouter();

  const [isSheetOpen, setIsSheetOpen] = useState(false); // State to control sheet open/close

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, authLoading, router]);

  useEffect(() => {
    if (currentUser?.uid) {
      const fetchInitialData = async () => {
        setPostsLoading(true);
        // Fetch user profile
        const userDocRef = doc(firestore, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setUserProfile(userDocSnap.data() as User);
        }

        // Fetch posts
        const postsRef = collection(firestore, 'posts');
        const q = query(postsRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        let postsData = querySnapshot.docs.map(doc => doc.id);

        // Shuffle the post IDs array
        for (let i = postsData.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [postsData[i], postsData[j]] = [postsData[j], postsData[i]];
        }

        // Limit to 20 posts for faster initial load
        postsData = postsData.slice(0, 20);
        
        setPostIds(postsData);
        setPostsLoading(false);
      };

      fetchInitialData();
    }
  }, [currentUser?.uid]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };
  
  const onPostCreated = (newPostId: string) => {
    setPostIds(prevPostIds => [newPostId, ...prevPostIds]);
  };

  if (authLoading || !currentUser || !userProfile) {
    return (
      <MainLayout>
        <div className="container mx-auto max-w-2xl px-4 py-6">
          <Skeleton className="h-24 w-full mb-8" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full mt-4" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mx-auto max-w-2xl py-6">
        <header className="mb-4 flex items-center justify-between px-4">
          <div>
            <h1 className="font-headline text-2xl font-bold text-primary">Global Dating Chat</h1>
            <p className="text-sm text-muted-foreground">Welcome back, {userProfile.fullName}!</p>
          </div>
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:w-3/4 md:w-1/2 lg:w-1/3 xl:w-1/4">
              <SheetHeader>
                <div className='flex items-center gap-3'>
                  <Avatar>
                    <AvatarImage src={userProfile.avatarUrl} alt={userProfile.fullName}/>
                    <AvatarFallback>{userProfile.fullName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <SheetTitle>{userProfile.fullName}</SheetTitle>
                </div>
              </SheetHeader>
              <div className="flex flex-col space-y-2 mt-4">
                <Button variant="ghost" className="justify-start" onClick={() => {router.push('/home'); setIsSheetOpen(false);}}>
                  <HomeIcon className="mr-2 h-4 w-4" />
                  <span>Home</span>
                </Button>
                <Button variant="ghost" className="justify-start" onClick={() => {router.push('/groups'); setIsSheetOpen(false);}}>
                  <Users className="mr-2 h-4 w-4" />
                  <span>Groups</span>
                </Button>
                <Button variant="ghost" className="justify-start" onClick={() => {router.push('/chat'); setIsSheetOpen(false);}}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  <span>Chat</span>
                </Button>
                <Button variant="ghost" className="justify-start" onClick={() => {router.push(`/profile/${currentUser.uid}`); setIsSheetOpen(false);}}>
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Button>
                <Button variant="ghost" className="justify-start" onClick={() => {router.push('/vip'); setIsSheetOpen(false);}}>
                  <Star className="mr-2 h-4 w-4" />
                  <span>VIP</span>
                </Button>
                <Separator />
                 <Button variant="ghost" className="justify-start" onClick={() => {router.push('/privacy'); setIsSheetOpen(false);}}>
                  <Shield className="mr-2 h-4 w-4" />
                  <span>Privacy Policy</span>
                </Button>
                <Button variant="ghost" className="justify-start text-red-500 hover:text-red-600" onClick={() => {handleLogout(); setIsSheetOpen(false);}}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        <div className="px-4">
            <CreatePost user={userProfile} onPostCreated={onPostCreated} />
        </div>
        <section className="mt-8">
          <div className="space-y-4">
            {postsLoading && (
              <div className="px-4 sm:px-0">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full mt-4" />
              </div>
            )}
            {postIds.map((postId) => (
              <div key={postId}>
                <PostCard postId={postId} currentUserId={currentUser.uid} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
