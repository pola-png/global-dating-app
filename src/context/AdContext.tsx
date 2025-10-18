
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { InterstitialAd } from '@/components/ads/InterstitialAd';

const INTERSTITIAL_AD_TRIGGER_COUNT = 5;

type AdContextType = {
  showInterstitial: () => void;
};

const AdContext = createContext<AdContextType | undefined>(undefined);

export function AdProvider({ children }: { children: ReactNode }) {
  const [navigationCount, setNavigationCount] = useState(0);
  const [isInterstitialVisible, setIsInterstitialVisible] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Increment count on path change, but not for the initial render
    setNavigationCount(prev => prev + 1);
  }, [pathname]);

  useEffect(() => {
    if (navigationCount > 0 && navigationCount % INTERSTITIAL_AD_TRIGGER_COUNT === 0) {
      setIsInterstitialVisible(true);
    }
  }, [navigationCount]);

  const showInterstitial = useCallback(() => {
    setIsInterstitialVisible(true);
  }, []);

  const handleCloseInterstitial = () => {
    setIsInterstitialVisible(false);
  };

  return (
    <AdContext.Provider value={{ showInterstitial }}>
      {children}
      {isInterstitialVisible && <InterstitialAd onAdClosed={handleCloseInterstitial} />}
    </AdContext.Provider>
  );
}

export function useAd() {
  const context = useContext(AdContext);
  if (context === undefined) {
    throw new Error('useAd must be used within an AdProvider');
  }
  return context;
}
