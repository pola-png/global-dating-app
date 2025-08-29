
'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Crown, Rocket, Star } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const vipFeatures = [
  { icon: Rocket, title: 'Profile Boosts', description: 'Get seen by more people with weekly profile boosts.' },
  { icon: Star, title: 'Unlimited Likes', description: 'Don\'t hold back. Send as many likes as you want.' },
  { icon: Crown, title: 'Admin Matchmaking', description: 'Directly connect with an admin for arranged dating matches.' },
  { icon: CheckCircle, title: 'VIP Badge', description: 'Stand out from the crowd with an exclusive VIP badge on your profile.' },
];

export default function VipPage() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <MainLayout>
        <div className="container mx-auto max-w-2xl px-4 py-6">
          <div className="text-center">
            <Skeleton className="mx-auto mb-4 h-20 w-20 rounded-full" />
            <Skeleton className="h-12 w-2/3 mx-auto" />
            <Skeleton className="h-6 w-1/2 mx-auto mt-2" />
          </div>
          <Skeleton className="mt-8 h-48 w-full" />
          <div className="mt-10">
            <Skeleton className="mb-6 h-8 w-1/3 mx-auto" />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto max-w-2xl px-4 py-6">
        <div className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-400 text-white shadow-lg">
                <Crown className="h-12 w-12" />
            </div>
            <h1 className="font-headline text-5xl font-bold text-amber-500">Become a VIP</h1>
            <p className="mt-2 text-lg text-muted-foreground">Unlock exclusive features to supercharge your dating experience.</p>
        </div>

        <Card className="mt-8 bg-gradient-to-br from-primary via-purple-600 to-accent text-primary-foreground shadow-2xl">
          <CardHeader>
            <CardTitle className="font-headline text-3xl text-center">VIP Membership</CardTitle>
            <CardDescription className="text-center text-purple-200">Choose the plan that's right for you.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="text-center">
              <p className="text-5xl font-bold">$19.99<span className="text-xl font-normal text-purple-200">/month</span></p>
            </div>
            <Button size="lg" className="mt-4 w-full max-w-xs bg-white text-primary font-headline text-xl shadow-lg transition-transform hover:scale-105 hover:bg-gray-100">
              Upgrade Now
            </Button>
          </CardContent>
        </Card>

        <div className="mt-10">
          <h2 className="mb-6 text-center font-headline text-3xl font-semibold">What you get</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {vipFeatures.map((feature, index) => (
              <Card key={index} className="shadow-lg">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-headline text-lg font-semibold">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
