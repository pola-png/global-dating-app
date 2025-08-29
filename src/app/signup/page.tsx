
'use client';

import { SignUpForm } from '@/components/auth/SignUpForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart } from 'lucide-react';
import Link from 'next/link';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 py-8">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
            <Heart className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="font-headline text-3xl">Create an Account</CardTitle>
          <CardDescription>Join our global community and find your connection.</CardDescription>
        </CardHeader>
        <CardContent>
          <SignUpForm />
          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link href="/login" className="underline">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
