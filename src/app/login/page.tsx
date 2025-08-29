
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: 'Login Successful',
        description: 'Welcome back!',
      });
      router.push('/');
    } catch (err: any) {
      let errorMessage = 'An unexpected error occurred.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errorMessage = 'No user found with these credentials.';
      } else {
        errorMessage = err.message;
      }
      setError(errorMessage);
      toast({
        title: 'Login Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handlePasswordReset = async () => {
    if (!resetEmail) {
      toast({
        title: 'Error',
        description: 'Please enter your email address.',
        variant: 'destructive',
      });
      return;
    }
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast({
        title: 'Password Reset Email Sent',
        description: 'Check your inbox for a link to reset your password.',
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
            <Heart className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="font-headline text-4xl">Global Dating Chat</CardTitle>
          <CardDescription>Sign in to connect with the world</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button type="button" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                      Forgot password?
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset Password</AlertDialogTitle>
                      <AlertDialogDescription>
                        Enter your email address below and we&apos;ll send you a link to reset your password.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Email</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="you@example.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handlePasswordReset}>Send Reset Link</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full font-headline text-lg">
              Login
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
              Sign up
            </Link>
          </div>
            <div className="mt-6 text-center text-xs text-muted-foreground">
                <Link href="/privacy" className="underline-offset-4 hover:underline">
                Privacy Policy
                </Link>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
