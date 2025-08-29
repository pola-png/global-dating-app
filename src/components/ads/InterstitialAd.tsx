
'use client';

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

type InterstitialAdProps = {
  onAdClosed: () => void;
};

export function InterstitialAd({ onAdClosed }: InterstitialAdProps) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  return (
    <div className="fixed inset-0 bg-black/90 z-[9999] flex flex-col items-center justify-center text-white">
      <div className="absolute top-4 right-4">
        {countdown > 0 ? (
          <div className="flex items-center gap-2 text-lg">
            <span>Skip in {countdown}</span>
          </div>
        ) : (
          <Button variant="ghost" size="icon" onClick={onAdClosed} className="text-white hover:text-white hover:bg-white/10">
            <X className="h-6 w-6" />
          </Button>
        )}
      </div>

      <div className="flex flex-col items-center justify-center p-8">
        <h2 className="text-2xl font-bold mb-4">Advertisement</h2>
        <div className="w-full max-w-sm h-96 bg-gray-700 flex items-center justify-center rounded-lg">
          <p>Your AdSense Interstitial Ad Unit Here</p>
        </div>
        <p className="mt-4 text-sm text-gray-400">This is a placeholder for an interstitial ad.</p>
      </div>
    </div>
  );
}
