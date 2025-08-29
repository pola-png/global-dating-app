
'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { User } from '@/lib/types';
import { Edit, Globe, Heart, MapPin, Sparkles, User as UserIcon, Users } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, firestore } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { doc, getDoc } from 'firebase/firestore';

const ProfileItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value?: string }) => (
  <div className="flex items-start gap-4">
    <Icon className="h-5 w-5 text-muted-foreground mt-1" />
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      {value ? <p className="font-medium">{value}</p> : <Skeleton className="h-5 w-24 mt-1" />}
    </div>
  </div>
);

export default function ProfilePage() {
  const [user, authLoading] = useAuthState(auth);
  const router = useRouter();
  const [profile, setProfile] = useState<User | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        setProfileLoading(true);
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setProfile(userDocSnap.data() as User);
        }
        setProfileLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const isLoading = authLoading || profileLoading;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto max-w-2xl px-4 py-6">
          <div className="mb-6 flex items-center justify-between">
            <Skeleton className="h-12 w-1/3" />
            <Skeleton className="h-10 w-28" />
          </div>
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex flex-col items-center gap-6 sm:flex-row">
                <Skeleton className="h-32 w-32 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-6 w-40" />
                </div>
              </div>
              <Separator className="my-6" />
              <Skeleton className="h-24 w-full" />
              <Separator className="my-6" />
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }
  
  if (!profile) return (
    <MainLayout>
      <div className="container mx-auto max-w-2xl px-4 py-6 text-center">
        <p>User profile not found.</p>
      </div>
    </MainLayout>
  );

  return (
    <MainLayout>
      <div className="container mx-auto max-w-2xl px-4 py-6">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-headline text-4xl font-bold">My Profile</h1>
            <p className="text-muted-foreground">This is how others see you.</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/profile/edit')}>
            <Edit className="mr-2 h-4 w-4" /> Edit Profile
          </Button>
        </header>

        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <Avatar className="h-32 w-32 border-4 border-primary">
                <AvatarImage src={profile.avatarUrl} alt={profile.fullName} data-ai-hint="person portrait" />
                <AvatarFallback>{profile.fullName?.slice(0, 2)}</AvatarFallback>
              </Avatar>
              <div className="text-center sm:text-left">
                <h2 className="font-headline text-3xl font-bold">{profile.fullName}</h2>
                <p className="text-lg text-muted-foreground">{profile.age} years old</p>
                <div className="mt-2 flex items-center justify-center gap-2 text-muted-foreground sm:justify-start">
                  <MapPin className="h-5 w-5" />
                  <span>{profile.city}, {profile.country}</span>
                </div>
              </div>
            </div>
            
            <Separator className="my-6" />

            <div className="space-y-4">
                <h3 className="font-headline text-xl font-semibold">About Me</h3>
                <p className="text-muted-foreground">{profile.about}</p>
                <Button variant="secondary" className="w-full sm:w-auto">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate New Summary with AI
                </Button>
            </div>

            <Separator className="my-6" />

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <ProfileItem icon={UserIcon} label="Gender" value={profile.gender} />
                <ProfileItem icon={Globe} label="Country" value={profile.country} />
                <ProfileItem icon={Heart} label="Relationship Status" value={profile.relationshipStatus} />
                <ProfileItem icon={Users} label="Looking for" value={profile.relationshipType} />
            </div>

          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
