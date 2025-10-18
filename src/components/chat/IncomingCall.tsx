
'use client';

import { useCall } from '@/context/CallContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff } from 'lucide-react';

export function IncomingCall() {
  const { incomingCall, answerCall, declineCall } = useCall();

  if (!incomingCall) {
    return null;
  }

  return (
    <Dialog open={!!incomingCall}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()} className="sm:max-w-md" hideCloseButton>
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-headline">Incoming Call</DialogTitle>
          <DialogDescription className="text-center">You have an incoming video call.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center gap-4 py-8">
          <Avatar className="h-24 w-24 border-4 border-primary">
            <AvatarImage src={incomingCall.caller.avatarUrl} alt={incomingCall.caller.fullName} />
            <AvatarFallback>{incomingCall.caller.fullName.charAt(0)}</AvatarFallback>
          </Avatar>
          <p className="text-xl font-semibold">{incomingCall.caller.fullName}</p>
          <p className="text-muted-foreground">wants to video chat with you.</p>
        </div>
        <div className="flex justify-around">
          <Button onClick={declineCall} size="lg" variant="destructive" className="rounded-full h-16 w-16 p-0">
            <PhoneOff className="h-8 w-8" />
          </Button>
          <Button onClick={answerCall} size="lg" className="bg-green-500 hover:bg-green-600 rounded-full h-16 w-16 p-0">
            <Phone className="h-8 w-8" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
