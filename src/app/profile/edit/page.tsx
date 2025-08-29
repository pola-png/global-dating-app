
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, firestore } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { countries } from '@/lib/countries';
import { useEffect, useState, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { User } from '@/lib/types';
import { ArrowLeft, XCircle, Upload, Trash2 } from 'lucide-react';
import { uploadFileToS3 } from '@/lib/aws-s3';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import { moderateImage } from '@/ai/flows/moderate-image-flow';
import Link from 'next/link';

const profileSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  country: z.string().min(1, { message: 'Please select a country.' }),
  city: z.string().min(2, { message: 'City is required.' }),
  gender: z.string().min(1, { message: 'Please select a gender.' }),
  age: z.coerce.number().min(18, { message: 'You must be at least 18 years old.' }),
  whatsapp: z.string().min(10, { message: 'A valid WhatsApp number is required.' }),
  relationshipType: z.string().min(1, { message: 'Please select a relationship type.' }),
  relationshipStatus: z.string().min(1, { message: 'Please select a relationship status.' }),
  about: z.string().min(20, { message: 'About section must be at least 20 characters.' }).max(500),
});

export default function EditProfilePage() {
  const [user, authLoading] = useAuthState(auth);
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | undefined>(undefined);
  const [profile, setProfile] = useState<User | null>(null);

  const profileImageInputRef = useRef<HTMLInputElement>(null);

  // State for gallery images
  const [galleryImageFiles, setGalleryImageFiles] = useState<(File | null)[]>([]);
  const [isUploadingGalleryImages, setIsUploadingGalleryImages] = useState(false);
  const [currentGalleryUrls, setCurrentGalleryUrls] = useState<(string | null)[]>([]);

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: '',
      country: '',
      city: '',
      gender: '',
      age: 18,
      whatsapp: '',
      relationshipType: '',
      relationshipStatus: '',
      about: '',
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        setLoading(true);
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data() as User;
          setProfile(userData);
          form.reset(userData);
          setCurrentAvatarUrl(userData.avatarUrl);
          setCurrentGalleryUrls(userData.galleryImages || []);
        }
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user, form]);

  const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      
      const tempUrl = URL.createObjectURL(file);
      setCurrentAvatarUrl(tempUrl);
      setProfileImageFile(file);
    }
  };

  const handleGalleryImageChange = (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setGalleryImageFiles(prev => {
        const newFiles = [...prev];
        newFiles[index] = file;
        return newFiles;
      });
      const tempUrl = URL.createObjectURL(file);
      setCurrentGalleryUrls(prev => {
        const newUrls = [...prev];
        newUrls[index] = tempUrl;
        return newUrls;
      });
    }
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImageFiles(prev => {
      const newFiles = [...prev];
      newFiles[index] = null;
      return newFiles;
    });
    setCurrentGalleryUrls(prev => {
      const newUrls = [...prev];
      newUrls[index] = null;
      // Filter out nulls to correctly manage the array length and display
      return newUrls;
    });
  };

  async function onSubmit(values: z.infer<typeof profileSchema>) {
    if (!user) return;
    
    setIsUploadingImage(true); // Combined uploading state
    
    let finalAvatarUrl = profile?.avatarUrl;
    let finalGalleryUrls = (profile?.galleryImages || []).filter(Boolean) as string[];

    try {
      // 1. Moderate and upload avatar if changed
      if (profileImageFile) {
        const dataUri = await fileToDataUri(profileImageFile);
        const moderationResult = await moderateImage({ photoDataUri: dataUri });
        if (!moderationResult.isAppropriate) {
          throw new Error(moderationResult.reason || 'Profile picture does not meet guidelines.');
        }
        finalAvatarUrl = await uploadFileToS3(profileImageFile, 'profile-images');
      }

      // 2. Moderate and upload new gallery images
      const newGalleryUploads = await Promise.all(
        galleryImageFiles.map(async (file, index) => {
          if (file) {
            const dataUri = await fileToDataUri(file);
            const moderationResult = await moderateImage({ photoDataUri: dataUri });
            if (!moderationResult.isAppropriate) {
               throw new Error(moderationResult.reason || `Gallery image ${index + 1} does not meet guidelines.`);
            }
            return uploadFileToS3(file, 'gallery-images');
          }
          return null;
        })
      );
      
      // 3. Combine old and new gallery URLs
      let combinedGalleryUrls: (string | null)[] = [...currentGalleryUrls];
      let newUploadIndex = 0;
      for (let i = 0; i < combinedGalleryUrls.length; i++) {
        if(galleryImageFiles[i]) {
            combinedGalleryUrls[i] = newGalleryUploads[newUploadIndex++];
        }
      }
      finalGalleryUrls = combinedGalleryUrls.filter(Boolean) as string[];


      // 4. Update Firestore
      const userDocRef = doc(firestore, 'users', user.uid);
      await updateDoc(userDocRef, { ...values, avatarUrl: finalAvatarUrl, galleryImages: finalGalleryUrls });
      
      toast({
        title: 'Profile Updated!',
        description: 'Your changes have been saved successfully.',
      });
      router.push(`/profile/${user.uid}`);

    } catch (error: any) {
      console.error('Update profile error:', error);
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsUploadingImage(false);
    }
  }

  if (authLoading || loading) {
    return (
      <MainLayout>
        <div className="container mx-auto max-w-2xl px-4 py-8">
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-4 w-2/3 mt-2" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-10 w-full max-w-xs mx-auto" />
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <Card>
          <CardHeader>
            <div className='flex items-center gap-4'>
                 <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft />
                </Button>
                <div>
                    <CardTitle className="font-headline text-3xl">Edit Your Profile</CardTitle>
                    <CardDescription>Keep your information up to date.</CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Profile Image Field */}
                 <div className="col-span-2 flex flex-col items-center justify-center space-y-4">
                    <FormLabel className="text-xl font-semibold">Profile Image</FormLabel>
                    <div className="relative group w-40 h-40">
                        <Avatar className="w-full h-full cursor-pointer" onClick={() => profileImageInputRef.current?.click()}>
                        <AvatarImage src={currentAvatarUrl || 'https://placehold.co/400x400.png'} alt="Profile Avatar" />
                        <AvatarFallback>{form.getValues('fullName')?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div 
                        className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        onClick={() => profileImageInputRef.current?.click()}
                        >
                        <Upload className="h-8 w-8 text-white" />
                        </div>
                    </div>
                    <FormControl>
                        <Input
                        ref={profileImageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        />
                    </FormControl>
                    <FormMessage />
                </div>
                  
                {/* Gallery Images Field */}
                <div className="col-span-2 space-y-4">
                  <h3 className="text-xl font-semibold text-center">Gallery Images (Max 2)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[0, 1].map((index) => (
                      <div key={index} className="flex flex-col items-center space-y-2 relative">
                        <div className="relative w-40 h-40 rounded-md overflow-hidden border-2 border-dashed flex items-center justify-center bg-muted">
                          {currentGalleryUrls[index] ? (
                            <>
                              <Image src={currentGalleryUrls[index]!} alt={`Gallery ${index + 1}`} width={160} height={160} className="w-full h-full object-cover" />
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-1 right-1 h-6 w-6 rounded-full z-10"
                                onClick={() => removeGalleryImage(index)}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <span className="text-muted-foreground">Image {index + 1}</span>
                          )}
                        </div>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleGalleryImageChange(e, index)}
                          className="w-full max-w-[200px]"
                        />
                      </div>
                    ))}
                  </div>
                </div>

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
                        <Select onValueChange={field.onChange} value={field.value}>
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
                        <Select onValueChange={field.onChange} value={field.value}>
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
                    name="relationshipType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Looking for</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
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
                        <Select onValueChange={field.onChange} value={field.value}>
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

                <div className="flex justify-end gap-4">
                    <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
                    <Button type="submit" className="font-headline" disabled={isUploadingImage}>
                      {isUploadingImage ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
