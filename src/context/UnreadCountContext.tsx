
'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

type UnreadCountContextType = {
  totalUnread: number;
  setTotalUnread: (count: number) => void;
  unreadGroupCount: number;
  setUnreadGroupCount: (count: number) => void;
};

const UnreadCountContext = createContext<UnreadCountContextType | undefined>(undefined);

export function UnreadCountProvider({ children }: { children: ReactNode }) {
  const [totalUnread, setTotalUnread] = useState(0);
  const [unreadGroupCount, setUnreadGroupCount] = useState(0);

  return (
    <UnreadCountContext.Provider value={{ totalUnread, setTotalUnread, unreadGroupCount, setUnreadGroupCount }}>
      {children}
    </UnreadCountContext.Provider>
  );
}

export function useUnreadCount() {
  const context = useContext(UnreadCountContext);
  if (context === undefined) {
    throw new Error('useUnreadCount must be used within an UnreadCountProvider');
  }
  return context;
}
