
'use client';

import { Button } from "@/components/ui/button";
import { Skeleton } from "../ui/skeleton";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

type AppOpenAdProps = {
  onAdClosed: () => void;
};

export function AppOpenAd({ onAdClosed }: AppOpenAdProps) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate ad loading time
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 bg-background z-[9999] flex flex-col">
      <header className="p-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
            <Heart className="h-4 w-4 text-primary-foreground" />
        </div>
        <h1 className="font-headline text-xl font-bold">Global Dating Chat</h1>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        {loading ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                <p className="text-muted-foreground">Loading ad...</p>
                <Skeleton className="w-full max-w-md h-96" />
            </div>
        ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-center">
                 <h2 className="text-2xl font-bold">Advertisement</h2>
                <div className="w-full max-w-md h-96 bg-muted flex items-center justify-center rounded-lg border-dashed border-2">
                    <p className="text-muted-foreground">Your AdSense "App Open" Ad Unit Here</p>
                </div>
            </div>
        )}
      </main>
      <footer className="p-4 flex justify-end">
        <Button onClick={onAdClosed} disabled={loading}>
          {loading ? 'Loading...' : 'Continue to App'}
        </Button>
      </footer>
    </div>
  );
}
