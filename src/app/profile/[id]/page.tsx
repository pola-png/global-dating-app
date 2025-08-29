
'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { User } from '@/lib/types';
import { Edit, Globe, Heart, MapPin, MessageSquare, ShieldCheck, Sparkles, User as UserIcon, Users, UserCheck, Upload, XCircle, Eye } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, firestore } from '@/lib/firebase';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, Timestamp, updateDoc, addDoc, serverTimestamp, arrayRemove } from 'firebase/firestore';
import Image from 'next/image';
import { uploadFileToS3, deleteFileFromS3 } from '@/lib/aws-s3';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription, DialogHeader } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { moderateImage } from '@/ai/flows/moderate-image-flow';


const ProfileItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value?: string }) => (
    <div className="flex items-start gap-4">
      <Icon className="h-5 w-5 text-muted-foreground mt-1" />
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        {value ? <p className="font-medium">{value}</p> : <Skeleton className="h-5 w-24 mt-1" />}
      </div>
    </div>
  );

export default function UserProfilePage() {
  const [currentUser, authLoading] = useAuthState(auth);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const router = useRouter();
  const params = useParams();
  const profileId = params.id as string;
  const { toast } = useToast();

  const [profile, setProfile] = useState<User | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const profileImageInputRef = useRef<HTMLInputElement>(null);

  // New state for gallery images
  const [isUploadingGalleryImages, setIsUploadingGalleryImages] = useState<boolean[]>(Array(3).fill(false));
  const galleryImageInputRefs = useRef<(HTMLInputElement | null)[]>(Array(3).fill(null));
  
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<number | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);


  const isOwnProfile = currentUser?.uid === profileId;
  const isAdmin = userProfile?.isAdmin || false;

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/');
    }
  }, [currentUser, authLoading, router]);
  
  useEffect(() => {
    if (currentUser?.uid) {
        const userDocRef = doc(firestore, 'users', currentUser.uid);
        const unsubscribe = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
                setUserProfile(doc.data() as User);
            }
        });
        return () => unsubscribe();
    }
  }, [currentUser?.uid]);

  useEffect(() => {
    if (profileId) {
      setProfileLoading(true);
      const userDocRef = doc(firestore, 'users', profileId);
      const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setProfile(docSnap.data() as User);
        } else {
          setProfile(null);
        }
        setProfileLoading(false);
      });
      return () => unsubscribe();
    }
  }, [profileId]);

  useEffect(() => {
    if(isAdmin) {
        const usersRef = collection(firestore, 'users');
        const unsubscribeTotal = onSnapshot(usersRef, (snapshot) => {
            setTotalUsers(snapshot.size);
        });

        const thirtyMinutesAgo = new Timestamp(Math.floor(Date.now() / 1000) - 30 * 60, 0);
        const onlineQuery = query(usersRef, where('lastSeen', '>', thirtyMinutesAgo));
        const unsubscribeOnline = onSnapshot(onlineQuery, (snapshot) => {
            setOnlineUsers(snapshot.size);
        });

        return () => {
            unsubscribeTotal();
            unsubscribeOnline();
        }
    }
  }, [isAdmin]);

  const handleChat = useCallback(() => {
    if (currentUser?.uid && profileId && currentUser.uid !== profileId) {
      const chatId = [currentUser.uid, profileId].sort().join('_');
      router.push(`/chat/${chatId}`);
    }
  }, [currentUser?.uid, profileId, router]);

  const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser || !profile) return;

    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setIsUploadingImage(true);
      try {
        const dataUri = await fileToDataUri(file);
        const moderationResult = await moderateImage({ photoDataUri: dataUri });

        if (!moderationResult.isAppropriate) {
            toast({
              title: 'Image Rejected',
              description: moderationResult.reason || 'The uploaded image does not meet our community guidelines.',
              variant: 'destructive',
            });
            return;
        }

        const newAvatarUrl = await uploadFileToS3(file, 'profile-images');
        const userDocRef = doc(firestore, 'users', currentUser.uid);
        await updateDoc(userDocRef, { avatarUrl: newAvatarUrl });

        // Create a post for the profile avatar update
        await addDoc(collection(firestore, 'posts'), {
          author: {
            uid: currentUser.uid,
            fullName: profile.fullName,
            avatarUrl: newAvatarUrl, // Use the new avatar URL
          },
          imageUrl: newAvatarUrl,
          caption: 'Updated their profile picture.',
          createdAt: serverTimestamp(),
          type: 'avatar_update',
        });
        
        toast({
          title: 'Profile image updated!',
          description: 'Your profile picture has been changed successfully.',
        });
      } catch (error: any) {
        console.error('Error uploading profile image:', error);
        toast({
          title: 'Image Upload Failed',
          description: error.message || 'There was an error uploading your image.',
          variant: 'destructive',
        });
      } finally {
        setIsUploadingImage(false);
        if (profileImageInputRef.current) {
          profileImageInputRef.current.value = '';
        }
      }
    }
  };

  const handleGalleryImageChange = async (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (!currentUser || !profile) return;

    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const newIsUploadingGalleryImages = [...isUploadingGalleryImages];
      newIsUploadingGalleryImages[index] = true;
      setIsUploadingGalleryImages(newIsUploadingGalleryImages);

      try {
        const dataUri = await fileToDataUri(file);
        const moderationResult = await moderateImage({ photoDataUri: dataUri });
        
        if (!moderationResult.isAppropriate) {
            toast({
              title: 'Image Rejected',
              description: moderationResult.reason || 'The uploaded image does not meet our community guidelines.',
              variant: 'destructive',
            });
            return;
        }

        const newImageUrl = await uploadFileToS3(file, 'gallery-images');
        const updatedGalleryImages = [...(profile.galleryImages || [])];
        updatedGalleryImages[index] = newImageUrl;

        const userDocRef = doc(firestore, 'users', currentUser.uid);
        await updateDoc(userDocRef, { galleryImages: updatedGalleryImages });

        // Create a post for the new gallery image
        await addDoc(collection(firestore, 'posts'), {
           author: {
            uid: currentUser.uid,
            fullName: profile.fullName,
            avatarUrl: profile.avatarUrl, // Use the current avatar URL
          },
          imageUrl: newImageUrl,
          caption: `Added a new gallery image.`,
          createdAt: serverTimestamp(),
          type: 'gallery_image_post',
        });

        toast({
          title: 'Gallery image updated!',
          description: `Gallery image ${index + 1} has been changed successfully.`,
        });
      } catch (error: any) {
        console.error('Error uploading gallery image:', error);
        toast({
          title: 'Image Upload Failed',
          description: error.message || 'There was an error uploading your image.',
          variant: 'destructive',
        });
      } finally {
        const newIsUploadingGalleryImages = [...isUploadingGalleryImages];
        newIsUploadingGalleryImages[index] = false;
        setIsUploadingGalleryImages(newIsUploadingGalleryImages);
         if (galleryImageInputRefs.current[index]) {
            galleryImageInputRefs.current[index]!.value = '';
        }
      }
    }
  };

 const removeGalleryImage = async (imageUrlToRemove: string) => {
    if (!currentUser || !profile) return;

    try {
      // 1. Delete from S3
      await deleteFileFromS3(imageUrlToRemove);

      // 2. Update Firestore using arrayRemove
      const userDocRef = doc(firestore, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        galleryImages: arrayRemove(imageUrlToRemove)
      });

      toast({
        title: 'Gallery image removed!',
        description: 'The image has been successfully deleted.',
      });
    } catch (error: any) {
      console.error('Error removing gallery image:', error);
      toast({
        title: 'Removal Failed',
        description: error.message || 'There was an error removing the image.',
        variant: 'destructive',
      });
    }
  };


  if (authLoading || profileLoading || (isAdmin && (totalUsers === null || onlineUsers === null))) {
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
            <h1 className="font-headline text-4xl font-bold">{isOwnProfile ? "My Profile" : profile.fullName}</h1>
            <p className="text-muted-foreground">{isOwnProfile ? "This is how others see you." : `View ${profile.fullName.split(' ')[0]}'s profile.`}</p>
          </div>
          {isOwnProfile && (
            <Button variant="outline" onClick={() => router.push('/profile/edit')}>
              <Edit className="mr-2 h-4 w-4" /> Edit Profile
            </Button>
          )}
        </header>

        {isOwnProfile && isAdmin && (
          <div className="mb-6 rounded-lg border border-blue-300 bg-blue-50 p-6 shadow-sm">
            <h3 className="font-headline text-2xl font-bold text-blue-800 mb-4">Admin Dashboard</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {totalUsers !== null ? (
                          <div className="text-2xl font-bold">{totalUsers}</div>
                        ) : (
                          <Skeleton className="h-8 w-16" />
                        )}
                        <p className="text-xs text-muted-foreground">all registered users</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Online Users</CardTitle>
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {onlineUsers !== null ? (
                          <div className="text-2xl font-bold">{onlineUsers}</div>
                        ) : (
                          <Skeleton className="h-8 w-16" />
                        )}
                        <p className="text-xs text-muted-foreground">currently active</p>
                    </CardContent>
                </Card>
            </div>
          </div>
        )}

        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <div className="relative flex items-end">
                <div className="h-32 w-32 border-4 border-primary rounded-full overflow-hidden">
                  <Avatar className="w-full h-full">
                    <AvatarImage src={profile.avatarUrl || 'https://placehold.co/400x400.png'} alt={profile.fullName} data-ai-hint="person portrait" />
                    <AvatarFallback>{profile.fullName.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                </div>
                {isOwnProfile && !isUploadingImage && (
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute bottom-0 right-0 h-8 w-8 rounded-full shadow-md"
                    onClick={() => profileImageInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                )}
                {isOwnProfile && isUploadingImage && (
                  <div className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-black bg-opacity-50 flex items-center justify-center">
                    <span className="text-white text-xs">...</span>
                  </div>
                )}
                <input
                  ref={profileImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
              <div className="text-center sm:text-left">
                <h2 className="font-headline text-3xl font-bold">{profile.fullName}</h2>
                <p className="text-lg text-muted-foreground">{profile.age} years old</p>
                <div className="mt-2 flex items-center justify-center gap-4 text-muted-foreground sm:justify-start">
                    <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        <span>{profile.city}, {profile.country}</span>
                    </div>
                     {!isOwnProfile && (
                        <Button onClick={handleChat} size="sm">
                            <MessageSquare className="mr-2 h-4 w-4" /> Chat
                        </Button>
                    )}
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="space-y-4">
                <h3 className="font-headline text-xl font-semibold">About {isOwnProfile ? 'Me' : profile.fullName.split(' ')[0]}</h3>
                <p className="text-muted-foreground">{profile.about}</p>
                 <div className='flex items-center gap-4'>
                    {isOwnProfile && (
                        <Button variant="secondary" className="w-full sm:w-auto">
                            <Sparkles className="mr-2 h-4 w-4" />
                            Generate New Summary with AI
                        </Button>
                    )}
                 </div>
            </div>

            <Separator className="my-6" />

             {/* Gallery Section */}
            {(isOwnProfile || (profile.galleryImages && profile.galleryImages.length > 0)) && (
              <div className="space-y-4">
                <h3 className="font-headline text-xl font-semibold">Gallery</h3>
                <Dialog>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Map existing images */}
                    {profile.galleryImages?.map((imageUrl, index) => (
                        <div key={imageUrl} className="group relative aspect-square w-full rounded-md overflow-hidden border-2 border-dashed">
                        <Image src={imageUrl} alt={`Gallery image ${index + 1}`} layout="fill" className="object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                           <DialogTrigger asChild>
                            <Button variant="outline" size="icon" onClick={() => setViewingImage(imageUrl)}>
                                <Eye className="h-4 w-4" />
                            </Button>
                            </DialogTrigger>
                            {isOwnProfile && (
                            <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                onClick={() => removeGalleryImage(imageUrl)}
                            >
                                <XCircle className="h-4 w-4" />
                            </Button>
                            )}
                        </div>
                        </div>
                    ))}
                    {/* Map upload placeholders */}
                    {isOwnProfile && Array.from({ length: 3 - (profile.galleryImages?.length || 0) }).map((_, index) => {
                        const uploadIndex = (profile.galleryImages?.length || 0) + index;
                        const isUploading = isUploadingGalleryImages[uploadIndex];
                        return (
                            <div key={`placeholder-${index}`} className="relative aspect-square w-full rounded-md overflow-hidden border-2 border-dashed flex items-center justify-center">
                            {isUploading ? (
                                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                                <span className="text-white text-sm">Uploading...</span>
                                </div>
                            ) : (
                                <div 
                                className="flex flex-col items-center justify-center text-muted-foreground cursor-pointer p-4 h-full w-full"
                                onClick={() => galleryImageInputRefs.current[uploadIndex]?.click()}
                                >
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-12 w-12 text-muted-foreground hover:text-primary pointer-events-none"
                                >
                                    <Upload className="h-6 w-6" />
                                </Button>
                                <span>Add Image</span>
                                </div>
                            )}
                            <input
                                ref={el => (galleryImageInputRefs.current[uploadIndex] = el)}
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleGalleryImageChange(e, uploadIndex)}
                                className="hidden"
                            />
                            </div>
                        );
                    })}
                    </div>
                    <DialogContent className="max-w-3xl h-[80vh] p-0">
                      <DialogHeader className="sr-only">
                        <DialogTitle>View Image</DialogTitle>
                        <DialogDescription>A larger view of the selected gallery image.</DialogDescription>
                      </DialogHeader>
                      {viewingImage && (
                          <Image src={viewingImage} alt="Viewing gallery image" layout="fill" className="object-contain" />
                      )}
                    </DialogContent>
                </Dialog>
              </div>
            )}


            <Separator className="my-6" />

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <ProfileItem icon={UserIcon} label="Gender" value={profile.gender} />
                <ProfileItem icon={Globe} label="Country" value={profile.country} />
                <ProfileItem icon={Heart} label="Relationship Status" value={profile.relationshipStatus} />
                <ProfileItem icon={Users} label="Looking for" value={profile.relationshipType} />
                {isAdmin && !isOwnProfile && profile.whatsapp && (
                    <div className="flex items-start gap-4 rounded-md border border-amber-300 bg-amber-50 p-3 sm:col-span-2">
                        <ShieldCheck className="h-5 w-5 text-amber-600 mt-1" />
                        <div>
                            <p className="text-sm text-amber-700">Admin View: WhatsApp</p>
                            <p className="font-medium text-amber-900">{profile.whatsapp}</p>
                        </div>
                    </div>
                )}
            </div>

          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

    
