
'use client';

import type { User } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { MapPin, MessageSquare, Sparkles } from 'lucide-react';
import { IcebreakerDialog } from './IcebreakerDialog';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

type ProfileCardProps = {
  user: User;
};

export function ProfileCard({ user }: ProfileCardProps) {
  const [currentUser] = useAuthState(auth);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const router = useRouter();

  const handleChat = () => {
    if (currentUser && user.uid) {
        const chatId = [currentUser.uid, user.uid].sort().join('_');
        router.push(`/chat/${chatId}`);
    }
  }

  const handleViewProfile = () => {
    router.push(`/profile/${user.uid}`);
  }

  return (
    <>
      <Card className="group relative w-full overflow-hidden shadow-lg transition-transform hover:scale-105">
        <CardContent className="p-0">
          <Avatar className="aspect-square w-full h-auto rounded-none">
            <AvatarImage src={user.avatarUrl} alt={user.fullName} className="aspect-square w-full object-cover" data-ai-hint="person portrait" />
            <AvatarFallback className="w-full h-full rounded-none flex items-center justify-center text-4xl">
              {user.fullName?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 w-full p-4 text-white">
            <h3 className="font-headline text-2xl font-bold">{user.fullName}</h3>
            <div className="flex items-center text-sm text-gray-200">
              <MapPin className="mr-1 h-4 w-4" />
              <span>{user.city}, {user.country}</span>
            </div>
          </div>
          <div className="absolute inset-0 flex translate-y-full flex-col items-center justify-center gap-4 bg-black/70 p-4 transition-transform group-hover:translate-y-0">
            <Button onClick={handleViewProfile} variant="outline" className="w-40 border-primary bg-transparent text-primary-foreground hover:bg-primary hover:text-primary-foreground">
              View Profile
            </Button>
            <Button onClick={handleChat} variant="secondary" className="w-40">
                <MessageSquare className="mr-2 h-4 w-4" /> Chat
            </Button>
            <Button onClick={() => setIsDialogOpen(true)} className="w-40">
              <Sparkles className="mr-2 h-4 w-4" />
              Get Icebreakers
            </Button>
          </div>
        </CardContent>
      </Card>
      <IcebreakerDialog user={user} open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </>
  );
}
