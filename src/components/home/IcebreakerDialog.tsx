'use client';

import { useState, useEffect } from 'react';
import { suggestIcebreakerQuestions } from '@/ai/flows/suggest-icebreaker-questions';
import type { User } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Clipboard, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';

type IcebreakerDialogProps = {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function IcebreakerDialog({ user, open, onOpenChange }: IcebreakerDialogProps) {
  const [questions, setQuestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      const generateQuestions = async () => {
        setLoading(true);
        setQuestions([]);
        try {
          const result = await suggestIcebreakerQuestions({ about: user.about });
          setQuestions(result.questions);
        } catch (error) {
          console.error('Failed to generate icebreakers:', error);
          toast({
            title: 'Error',
            description: 'Could not generate icebreakers. Please try again.',
            variant: 'destructive',
          });
        } finally {
          setLoading(false);
        }
      };
      generateQuestions();
    }
  }, [open, user.about, toast]);

  const handleCopy = (question: string, index: number) => {
    navigator.clipboard.writeText(question);
    setCopied(index);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-headline text-2xl">
            <Sparkles className="h-6 w-6 text-primary" />
            Icebreakers for {user.fullName.split(',')[0]}
          </DialogTitle>
          <DialogDescription>
            Start the conversation with one of these AI-suggested questions.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          {loading && (
            <>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </>
          )}
          {!loading && questions.map((q, i) => (
            <div key={i} className="flex items-center justify-between gap-2 rounded-lg border p-3">
              <p className="flex-1 text-sm">{q}</p>
              <Button size="icon" variant="ghost" onClick={() => handleCopy(q, i)}>
                {copied === i ? <Check className="h-4 w-4 text-green-500" /> : <Clipboard className="h-4 w-4" />}
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
