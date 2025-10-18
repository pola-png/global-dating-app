
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuthState } from 'react-firebase-hooks/auth';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, ShieldAlert } from 'lucide-react';

const deleteSchema = z.object({
  password: z.string().min(1, { message: 'Password is required to confirm account deletion.' }),
});

export default function DeleteAccountPage() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const form = useForm<z.infer<typeof deleteSchema>>({
    resolver: zodResolver(deleteSchema),
    defaultValues: { password: '' },
  });

  const onSubmit = async (values: z.infer<typeof deleteSchema>) => {
    if (!user || !user.email) {
      setError('Could not verify user. Please log in again.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Re-authenticate the user for security
      const credential = EmailAuthProvider.credential(user.email, values.password);
      await reauthenticateWithCredential(user, credential);

      // 2. Call the Firebase Function to delete all user data
      const functions = getFunctions();
      const deleteUserAccount = httpsCallable(functions, 'deleteUserAccount');
      const result = await deleteUserAccount();

      if (result.data.success) {
        toast({
          title: 'Account Deleted',
          description: 'Your account and all associated data have been permanently removed.',
        });
        // The auth state listener will catch the deletion and redirect, but we can force it.
        await auth.signOut();
        router.push('/login');
      } else {
        throw new Error((result.data as any).error || 'An unknown error occurred during deletion.');
      }
    } catch (err: any) {
      console.error('Account deletion error:', err);
      let errorMessage = 'An unexpected error occurred. Please try again.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errorMessage = 'The password you entered is incorrect. Please try again.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      toast({
        title: 'Deletion Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <Card className="border-destructive">
          <CardHeader>
             <div className='flex items-center gap-4 mb-4'>
                 <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft />
                </Button>
                <div>
                    <CardTitle className="font-headline text-3xl text-destructive">Delete Account</CardTitle>
                    <CardDescription>This action is permanent and cannot be undone.</CardDescription>
                </div>
            </div>
             <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Warning: Permanent Action</AlertTitle>
                <AlertDescription>
                    Deleting your account will permanently erase all your data, including your profile, photos, posts, chats, and connections. This process is irreversible.
                </AlertDescription>
            </Alert>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <p className="text-sm text-muted-foreground">
                    To confirm this action, please enter your password below.
                </p>
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter your password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 {error && <p className="text-sm font-medium text-destructive">{error}</p>}
                <Button type="submit" variant="destructive" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting Account...
                    </>
                  ) : (
                    'I understand, delete my account permanently'
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
