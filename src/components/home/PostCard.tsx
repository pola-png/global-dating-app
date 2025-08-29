
'use client';

import type { Post, ReactionType, Comment, User } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, MessageSquare, Laugh, ThumbsUp, Send, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { doc, onSnapshot, runTransaction, collection, addDoc, serverTimestamp, query, orderBy, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '../ui/input';
import { Separator } from '../ui/separator';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { Textarea } from '../ui/textarea';
import { Skeleton } from '../ui/skeleton';
import Image from 'next/image';

type PostCardProps = {
  postId: string;
  currentUserId: string;
};

const ReactionCount = ({ count }: { count: number }) => {
    const [prevCount, setPrevCount] = useState(count);
    const [direction, setDirection] = useState<'up' | 'down' | null>(null);
  
    useEffect(() => {
      if (count > prevCount) {
        setDirection('up');
      } else if (count < prevCount) {
        setDirection('down');
      }
      const timer = setTimeout(() => {
        setDirection(null);
        setPrevCount(count);
      }, 300);
      return () => clearTimeout(timer);
    }, [count, prevCount]);
  
    return (
      <div className="relative h-5 w-6 overflow-hidden">
        <span
          key={count}
          className={cn(
            "absolute inset-0 flex items-center justify-center transition-transform duration-300",
            direction === 'up' && '-translate-y-full animate-swipe-up-in',
            direction === 'down' && 'translate-y-full animate-swipe-down-in'
          )}
        >
          {count}
        </span>
      </div>
    );
  };

export function PostCard({ postId, currentUserId }: PostCardProps) {
  const [currentUser] = useAuthState(auth);
  const [post, setPost] = useState<Post | null>(null);
  const [author, setAuthor] = useState<User | null>(null);
  const [reactions, setReactions] = useState<Post['reactions']>({ like: 0, heart: 0, laugh: 0 });
  const [userReactions, setUserReactions] = useState<Post['userReactions']>({});
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showCommentsDialog, setShowCommentsDialog] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);
  const router = useRouter();

  const [localUserReaction, setLocalUserReaction] = useState<ReactionType | null>(null);
  
  useEffect(() => {
    const postRef = doc(firestore, 'posts', postId);
    const unsubscribePost = onSnapshot(postRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Post;
        const postData = {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
        }
        setPost(postData);
        setReactions(data.reactions || { like: 0, heart: 0, laugh: 0 });
        setUserReactions(data.userReactions || {});
        setLocalUserReaction(data.userReactions?.[currentUserId] || null);

        if (data.author?.uid) {
            const authorRef = doc(firestore, 'users', data.author.uid);
            const unsubscribeAuthor = onSnapshot(authorRef, (authorSnap) => {
                if (authorSnap.exists()) {
                    setAuthor(authorSnap.data() as User);
                } else {
                    setAuthor(data.author as User); // fallback to post data
                }
            });
            return () => unsubscribeAuthor();
        } else {
            setAuthor(null);
        }

      } else {
        setPost(null);
      }
    });

    const commentsRef = collection(firestore, 'posts', postId, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'asc'));
    const unsubscribeComments = onSnapshot(q, (snapshot) => {
        const commentsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Comment));
        setComments(commentsData);
    });


    return () => {
        unsubscribePost();
        unsubscribeComments();
    };
  }, [postId, currentUserId]);

  const handleReaction = async (reaction: ReactionType) => {
    if (!post) return;
    const postRef = doc(firestore, 'posts', postId);
    const newReaction = localUserReaction === reaction ? null : reaction;
    const oldLocalReaction = localUserReaction;
    
    // Optimistic UI update
    setLocalUserReaction(newReaction);
    setReactions(prev => {
        const newCounts = { ...prev };
        if(oldLocalReaction) {
            newCounts[oldLocalReaction] = Math.max(0, (newCounts[oldLocalReaction] || 0) - 1);
        }
        if(newReaction) {
            newCounts[newReaction] = (newCounts[newReaction] || 0) + 1;
        }
        return newCounts;
    });
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const postDoc = await transaction.get(postRef);
            if (!postDoc.exists()) {
                throw "Document does not exist!";
            }

            const postData = postDoc.data() as Post;
            const currentReactions = postData.reactions || { like: 0, heart: 0, laugh: 0 };
            const currentUserReactions = postData.userReactions || {};
            const existingReaction = currentUserReactions[currentUserId];

            if (existingReaction) {
                currentReactions[existingReaction] = Math.max(0, (currentReactions[existingReaction] || 0) - 1);
            }

            if (newReaction) {
                currentReactions[newReaction] = (currentReactions[newReaction] || 0) + 1;
                currentUserReactions[currentUserId] = newReaction;
            } else {
                delete currentUserReactions[currentUserId];
            }
            
            transaction.update(postRef, { reactions: currentReactions, userReactions: currentUserReactions });
        });
    } catch (error) {
        console.error("Error updating reaction: ", error);
        // Revert UI on failure
        setReactions(prev => {
            const revertedCounts = { ...prev };
            if(oldLocalReaction) {
                revertedCounts[oldLocalReaction] = (revertedCounts[oldLocalReaction] || 0) + 1;
            }
            if(newReaction) {
                revertedCounts[newReaction] = Math.max(0, (revertedCounts[newReaction] || 0) - 1);
            }
            return revertedCounts;
        });
        setLocalUserReaction(oldLocalReaction);
    }
  }
  
  const handleChat = () => {
    if (author && author.uid && author.uid !== currentUserId) {
        const chatId = [currentUserId, author.uid].sort().join('_');
        router.push(`/chat/${chatId}`);
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim() === '' || !currentUser || isSubmittingComment || !post) return;

    setIsSubmittingComment(true);
    try {
        const commentsRef = collection(firestore, 'posts', post.id, 'comments');
        await addDoc(commentsRef, {
            text: newComment,
            author: {
                uid: currentUser.uid,
                fullName: currentUser.displayName,
                avatarUrl: currentUser.photoURL,
            },
            createdAt: serverTimestamp()
        });
        setNewComment('');
        setIsCommenting(false);
        if (comments.length <= 2) {
            setShowComments(true); // Show comments after posting
        }
    } catch (error) {
        console.error("Error adding comment: ", error);
    } finally {
        setIsSubmittingComment(false);
    }
  }
  
  const getTextSizeClass = (textLength: number) => {
    if (textLength < 50) return 'text-3xl';
    if (textLength < 100) return 'text-2xl';
    if (textLength < 150) return 'text-xl';
    return 'text-lg';
  };

  const handleCommentClick = () => {
    if (comments.length > 2) {
        setShowCommentsDialog(true);
    } else {
        setShowComments(!showComments);
    }
  }

  const renderComments = () => (
    <div className="w-full space-y-3">
        {comments.map(comment => (
            <div key={comment.id} className="flex items-start gap-2">
                <Avatar className="h-8 w-8">
                    <AvatarImage src={comment.author.avatarUrl} alt={comment.author.fullName || 'User'}/>
                    <AvatarFallback>{comment.author.fullName?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div className="w-full rounded-md bg-muted px-3 py-2">
                    <div className="flex items-baseline justify-between">
                        <p className="text-sm font-semibold">{comment.author.fullName}</p>
                        <p className="text-xs text-muted-foreground">
                            {comment.createdAt ? formatDistanceToNow((comment.createdAt as any).toDate(), { addSuffix: true }) : 'Just now'}
                        </p>
                    </div>
                    <p className="text-sm">{comment.text}</p>
                </div>
            </div>
        ))}
    </div>
  )

  if (!post || !author) {
    return <Skeleton className="h-96 w-full" />;
  }
  
  const createdAt = post.createdAt ? formatDistanceToNow(post.createdAt, { addSuffix: true }) : 'Just now';
  const authorName = author.fullName || 'Anonymous User';
  const authorAvatar = author.avatarUrl;
  const authorUid = author.uid;

  const renderPostContent = () => {
    if (post.type === 'avatar_update' || post.type === 'gallery_image_post') {
      return (
        <div className='flex flex-col items-center gap-4 p-4'>
            <p className='text-sm text-muted-foreground self-start'>{post.caption}</p>
            {post.imageUrl && (
                <Image src={post.imageUrl} alt="Post image" width={400} height={400} className="rounded-lg object-cover w-full max-h-[500px]" />
            )}
        </div>
      )
    }
    return (
        <div className={cn('p-6 min-h-[300px] flex items-center justify-center', post.backgroundColor, post.textColor, post.isCentered && 'text-center')}>
            <p className={cn('font-bold', getTextSizeClass(post.text?.length || 0))}>{post.text || ''}</p>
        </div>
    )
  }

  return (
    <>
    <Card className="overflow-hidden shadow-md">
      <CardHeader className="flex flex-row items-center justify-between p-4">
        {authorUid ? (
          <Link href={`/profile/${authorUid}`} className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={authorAvatar} alt={authorName} data-ai-hint="person" />
                <AvatarFallback>{authorName?.charAt(0) || 'A'}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold hover:underline">{authorName}</p>
                <p className="text-sm text-muted-foreground">{createdAt}</p>
              </div>
          </Link>
        ) : (
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={authorAvatar} alt={authorName} data-ai-hint="person" />
              <AvatarFallback>{authorName?.charAt(0) || 'A'}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{authorName}</p>
              <p className="text-sm text-muted-foreground">{createdAt}</p>
            </div>
          </div>
        )}
        {authorUid && authorUid !== currentUserId && (
          <Button variant="ghost" size="sm" onClick={handleChat}>
            <span className='text-primary font-semibold'>Chat me</span>
            <MessageSquare className="h-5 w-5 text-primary" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {renderPostContent()}
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-2 p-4">
        <div className="flex w-full justify-between items-center gap-4">
            <div className="flex gap-1">
              <Button 
                variant={localUserReaction === 'like' ? 'default' : 'ghost'} 
                size="sm" 
                className={cn("gap-1.5", localUserReaction === 'like' && "bg-blue-500 text-white hover:bg-blue-600")} 
                onClick={() => handleReaction('like')}
              >
                <ThumbsUp className="h-4 w-4" /> <ReactionCount count={reactions?.like || 0} />
              </Button>
              <Button 
                variant={localUserReaction === 'heart' ? 'default' : 'ghost'} 
                size="sm" 
                className={cn("gap-1.5", localUserReaction === 'heart' && "bg-rose-500 text-white hover:bg-rose-600")} 
                onClick={() => handleReaction('heart')}
              >
                <Heart className="h-4 w-4" /> <ReactionCount count={reactions?.heart || 0} />
              </Button>
              <Button 
                variant={localUserReaction === 'laugh' ? 'default' : 'ghost'} 
                size="sm" 
                className={cn("gap-1.5", localUserReaction === 'laugh' && "bg-amber-500 text-white hover:bg-amber-600")} 
                onClick={() => handleReaction('laugh')}
              >
                <Laugh className="h-4 w-4" /> <ReactionCount count={reactions?.laugh || 0} />
              </Button>
            </div>
             <div onClick={handleCommentClick} className="flex cursor-pointer items-center gap-1 text-sm text-muted-foreground hover:text-primary">
                <span>{comments.length} {comments.length === 1 ? 'comment' : 'comments'}</span>
            </div>
        </div>

        {isCommenting ? (
             <form onSubmit={handleAddComment} className="w-full space-y-2">
                <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..." 
                    className="h-20"
                    disabled={isSubmittingComment}
                    autoFocus
                />
                <div className='flex justify-end gap-2'>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setIsCommenting(false)} disabled={isSubmittingComment}>Cancel</Button>
                    <Button type="submit" size="sm" disabled={isSubmittingComment || newComment.trim() === ''}>
                        <Send className="h-4 w-4 mr-2" />
                        Send
                    </Button>
                </div>
            </form>
        ) : (
            <div className='w-full'>
                <Input
                    placeholder="Write a comment..."
                    className="h-9"
                    onFocus={() => setIsCommenting(true)}
                    readOnly
                />
            </div>
        )}

        {showComments && comments.length > 0 && comments.length <= 2 && renderComments()}
      </CardFooter>
    </Card>

    <Dialog open={showCommentsDialog} onOpenChange={setShowCommentsDialog}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Comments</DialogTitle>
          <DialogDescription>
            All comments for this post.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
            {renderComments()}
        </ScrollArea>
      </DialogContent>
    </Dialog>
    </>
  );
}
