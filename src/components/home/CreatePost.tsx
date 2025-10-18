
'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AlignCenter, AlignLeft, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import type { User } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

const colors = [
  { name: 'gray', bg: 'bg-gray-200', text: 'text-gray-800' },
  { name: 'white', bg: 'bg-white', text: 'text-black' },
  { name: 'sky', bg: 'bg-sky-200', text: 'text-sky-800' },
  { name: 'rose', bg: 'bg-rose-200', text: 'text-rose-800' },
  { name: 'teal', bg: 'bg-teal-200', text: 'text-teal-800' },
  { name: 'amber', bg: 'bg-amber-200', text: 'text-amber-800' },
  { name: 'violet', bg: 'bg-violet-200', text: 'text-violet-800' },
  { name: 'black', bg: 'bg-black', text: 'text-white' },
  { name: 'red', bg: 'bg-red-500', text: 'text-white' },
  { name: 'blue', bg: 'bg-blue-500', text: 'text-white' },
  { name: 'green', bg: 'bg-green-500', text: 'text-white' },
];

type CreatePostProps = {
    user: User;
    onPostCreated: (postId: string) => void;
}

export function CreatePost({ user, onPostCreated }: CreatePostProps) {
  const [text, setText] = useState('');
  const [selectedColor, setSelectedColor] = useState(colors[0]);
  const [isCentered, setIsCentered] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();
  const [isPosting, setIsPosting] = useState(false);

  const handlePost = async () => {
    if (text.trim() === '' || isPosting) {
        if(text.trim() === '') toast({ title: 'Error', description: 'Post cannot be empty.', variant: 'destructive' });
        return;
    }
    
    setIsPosting(true);

    try {
        const postRef = await addDoc(collection(firestore, 'posts'), {
            text,
            author: {
                uid: user.uid,
                fullName: user.fullName,
                avatarUrl: user.avatarUrl,
            },
            backgroundColor: selectedColor.bg,
            textColor: selectedColor.text,
            isCentered,
            createdAt: serverTimestamp(),
            reactions: { like: 0, heart: 0, laugh: 0 },
            userReactions: {},
            type: 'text_post'
        });
        toast({ title: 'Success!', description: 'Your post has been shared.' });
        onPostCreated(postRef.id);
        setText('');
        setIsExpanded(false);
        setSelectedColor(colors[0]);
    } catch (error) {
        console.error("Error creating post: ", error);
        toast({ title: 'Error', description: 'Failed to share post. Please try again.', variant: 'destructive' });
    } finally {
        setIsPosting(false);
    }
  };

  return (
    <Card className={cn("overflow-hidden shadow-lg transition-all w-full")}>
      <CardContent className={cn("p-2", isExpanded && "p-4")}>
        <div className="flex items-start gap-4">
            <Avatar>
                <AvatarImage src={user.avatarUrl} alt={user.fullName}/>
                <AvatarFallback>{user.fullName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className={cn('flex-1 rounded-lg transition-colors', isExpanded && selectedColor.bg, isExpanded && "p-4")}>
            <Textarea
                value={text}
                onFocus={() => setIsExpanded(true)}
                onChange={(e) => setText(e.target.value)}
                placeholder="What's on your mind?"
                className={cn(
                'border-none bg-transparent text-lg focus-visible:ring-0 focus-visible:ring-offset-0 resize-none',
                isExpanded && selectedColor.text,
                isCentered && 'text-center',
                !isExpanded ? 'h-10' : 'min-h-[120px]'
                )}
            />
            </div>
        </div>
        {isExpanded && (
            <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                {colors.map((color) => (
                <button
                    key={color.name}
                    onClick={() => setSelectedColor(color)}
                    className={cn(
                    'h-6 w-6 rounded-full transition-transform hover:scale-110 border',
                    color.bg,
                    selectedColor.name === color.name && 'ring-2 ring-primary ring-offset-2'
                    )}
                    aria-label={`Select ${color.name} background`}
                />
                ))}
                <button
                    onClick={() => setIsCentered(!isCentered)}
                    className="ml-2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    aria-label={isCentered ? 'Align left' : 'Align center'}
                >
                    {isCentered ? <AlignLeft className="h-5 w-5" /> : <AlignCenter className="h-5 w-5" />}
                </button>
            </div>
            <Button onClick={handlePost} size="sm" className="font-headline" disabled={isPosting}>
                {isPosting ? 'Posting...' : 'Post'}
                </Button>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
