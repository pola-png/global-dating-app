
'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Users, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, firestore } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { collection, onSnapshot, doc, query } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { cn } from '@/lib/utils';
import { countries } from '@/lib/countries';
import { countryCodes } from '@/lib/country-codes';


interface Group {
  id: string;
  name: string;
  slug: string;
  memberCount: number; 
  country: string;
  countryCode: string | null;
}

export default function GroupsPage() {
  const [user, authLoading] = useAuthState(auth);
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);
  
  useEffect(() => {
    if (!user?.uid) return;

    setPageLoading(true);

    const userProfileRef = doc(firestore, 'users', user.uid);
    const unsubscribeProfile = onSnapshot(userProfileRef, (doc) => {
      if (doc.exists()) {
        setUserProfile(doc.data() as User);
      } else {
        setUserProfile(null);
      }
    });

    const groupsMetadataRef = collection(firestore, 'groupMetadata');
    const q = query(groupsMetadataRef);
    const unsubscribeGroups = onSnapshot(q, (snapshot) => {
        const firestoreGroups: { [slug: string]: Group } = {};
        snapshot.docs.forEach((docSnapshot) => {
            const groupData = docSnapshot.data();
            const slug = groupData.slug;
            firestoreGroups[slug] = {
                id: docSnapshot.id,
                name: groupData.name,
                slug: slug,
                memberCount: groupData.memberCount || 0,
                country: groupData.country,
                countryCode: groupData.countryCode,
            };
        });

        const allGroups = countries.map(countryName => {
            const slug = countryName.toLowerCase().replace(/ /g, '-');
            if (firestoreGroups[slug]) {
                return firestoreGroups[slug];
            } else {
                const countryInfo = countryCodes.find(c => c.name === countryName);
                return {
                    id: slug,
                    name: `Meet partners in ${countryName}`,
                    slug: slug,
                    memberCount: 0,
                    country: countryName,
                    countryCode: countryInfo?.code || null,
                };
            }
        });
        
        const priorityCountries = ["United States", "United Kingdom", "Canada"];
        allGroups.sort((a, b) => {
            const aPriority = priorityCountries.indexOf(a.country);
            const bPriority = priorityCountries.indexOf(b.country);

            if (aPriority > -1 && bPriority > -1) return aPriority - bPriority;
            if (aPriority > -1) return -1;
            if (bPriority > -1) return 1;
            return a.name.localeCompare(b.name);
        });
        
        setGroups(allGroups);
        setPageLoading(false);
    }, (error) => {
      console.error("Error fetching groups:", error);
      setPageLoading(false);
    });

    return () => {
        unsubscribeProfile();
        unsubscribeGroups();
    };
  }, [user?.uid]);


  const filteredGroups = useMemo(() => {
    if (!searchQuery) {
      return groups;
    }
    return groups.filter(group =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [groups, searchQuery]);

  if (pageLoading || !user) {
    return (
      <MainLayout>
        <div className="container mx-auto max-w-2xl px-4 py-6">
          <header className="mb-4">
            <h1 className="font-headline text-2xl font-bold">Country Groups</h1>
            <p className="text-sm text-muted-foreground">Find your community and connect with people from your country.</p>
          </header>
          <Skeleton className="h-10 w-full mb-6" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
             <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto max-w-2xl px-4 py-6">
        <header className="mb-4">
          <h1 className="font-headline text-2xl font-bold">Country Groups</h1>
          <p className="text-sm text-muted-foreground">Find your community and connect with people from your country.</p>
        </header>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Search for a country group..." 
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredGroups.map((group) => {
            const hasJoined = userProfile?.joinedGroups?.includes(group.slug);
            return (
                <Card key={group.slug} className="group flex flex-col justify-between overflow-hidden shadow-lg transition-all hover:shadow-xl">
                <CardContent className="p-4">
                    <CardTitle className="mb-2 flex items-center gap-2 font-headline text-xl h-14 overflow-hidden">
                        {group.countryCode && (
                            <Image
                                src={`https://flagsapi.com/${group.countryCode}/flat/64.png`}
                                alt={`${group.country} flag`}
                                width={32}
                                height={32}
                                className="rounded-full object-cover"
                            />
                        )}
                        <span>{group.country}</span>
                    </CardTitle>
                    <div className="mb-4 flex items-center text-sm text-muted-foreground">
                    <Users className="mr-2 h-4 w-4" />
                     {group.memberCount !== null ? (
                        <span>{group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}</span>
                     ) : (
                        <span>0 members</span>
                     )}
                    </div>
                    <Link href={`/groups/${group.slug}`} passHref>
                    <Button className={cn("w-full font-headline", hasJoined && "bg-green-600 hover:bg-green-700")}>
                        {hasJoined ? <CheckCircle className="mr-2 h-4 w-4" /> : null}
                        {hasJoined ? 'Visit' : 'Join Group'}
                    </Button>
                    </Link>
                </CardContent>
                </Card>
            )
        })}
        </div>
      </div>
    </MainLayout>
  );
}
