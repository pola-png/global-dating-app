
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, firestore } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { countries } from '@/lib/countries';
import { countryCodes } from '@/lib/country-codes';
import { useEffect } from 'react';
import { Checkbox } from '../ui/checkbox';

const signUpSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  country: z.string().min(1, { message: 'Please select a country.' }),
  city: z.string().min(2, { message: 'City is required.' }),
  gender: z.string().min(1, { message: 'Please select a gender.' }),
  age: z.coerce.number().min(18, { message: 'You must be at least 18 years old.' }),
  whatsapp: z.string().min(10, { message: 'A valid WhatsApp number is required.' }),
  relationshipType: z.string().min(1, { message: 'Please select a relationship type.' }),
 relationshipStatus: z.string().min(1, { message: 'Please select a relationship status.' }),
  about: z.string().min(20, { message: 'About section must be at least 20 characters.' }).max(500),
  acceptTerms: z.boolean().refine(val => val === true, { message: 'You must accept the terms and privacy policy.' }),
});

export function SignUpForm() {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      country: '',
      city: '',
      gender: '',
      age: 18,
      whatsapp: '',
      relationshipType: '',
      relationshipStatus: '',
      about: '',
      acceptTerms: false,
    },
  });

  const selectedCountry = form.watch('country');

  useEffect(() => {
 if (selectedCountry) {
      const country = countryCodes.find(c => c.name === selectedCountry);
      if (country) {
        form.setValue('whatsapp', country.dial_code);
      }
    }
  }, [selectedCountry, form]);

  async function onSubmit(values: z.infer<typeof signUpSchema>) {
    try {
      const { email, password, acceptTerms, ...profileData } = values;
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

 const isAdmin = email === 'Oladeleolamilekan172@gmail.com';

      await setDoc(doc(firestore, 'users', user.uid), {
        ...profileData,
        uid: user.uid,
        email: user.email,
        avatarUrl: `https://placehold.co/400x400.png?text=${profileData.fullName.charAt(0)}`,
        isAdmin: isAdmin,
      });

      toast({
        title: 'Profile Created!',
        description: 'Welcome to Global Dating Chat. You will be redirected to the home page.',
      });
      router.push('/');
    } catch (error: any) {
      console.error('Sign up error:', error);
      toast({
        title: 'Sign Up Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
 />
           <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="you@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
 />
           <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
 />
          <FormField
            control={form.control}
            name="age"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Age</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
 />
          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gender</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your gender" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="non-binary">Non-binary</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
 />
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your country" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-[20rem]">
                    {countries.map((country) => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
 />
          <FormField
            control={form.control}
            name="whatsapp"
            render={({ field }) => (
              <FormItem>
                <FormLabel>WhatsApp Number</FormLabel>
                <FormControl>
                  <Input placeholder="+1234567890" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
 />
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input placeholder="New York" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
 />
          <FormField
            control={form.control}
            name="relationshipType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Looking for</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select relationship type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Long-term">Long-term partner</SelectItem>
                    <SelectItem value="Short-term">Short-term fun</SelectItem>
                    <SelectItem value="Friendship">Friendship</SelectItem>
                    <SelectItem value="Serious relationship">Serious relationship</SelectItem>
                    <SelectItem value="Not sure">Still figuring it out</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
 />
          <FormField
            control={form.control}
            name="relationshipStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Relationship Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Single">Single</SelectItem>
                    <SelectItem value="In a relationship">In a relationship</SelectItem>
                    <SelectItem value="Complicated">It's complicated</SelectItem>
                    <SelectItem value="Open">In an open relationship</SelectItem>
                    <SelectItem value="Divorced">Divorced</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
 />
        </div>

        <FormField
            control={form.control}
            name="about"
            render={({ field }) => (
              <FormItem>
                <FormLabel>About You</FormLabel>
                <FormControl>
                  <Textarea placeholder="Tell us about your hobbies, interests, and what makes you unique..." className="min-h-[100px]" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
 />

        <FormField
          control={form.control}
          name="acceptTerms"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                    Accept terms and policy
                </FormLabel>
                <p className="text-sm text-muted-foreground">
                  By signing up, you agree to our{' '}
                  <Link href="/privacy" className="underline hover:text-primary">
                    Privacy Policy
                  </Link>.
                </p>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />


        <div className="flex flex-col items-center gap-4">
          <Button type="submit" className="w-full max-w-xs font-headline text-lg">Create Account</Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </form>
    </Form>
  );
}
