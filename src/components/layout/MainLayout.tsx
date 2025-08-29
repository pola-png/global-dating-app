
'use client';

import { BottomNavBar } from './BottomNavBar';
import { usePathname } from 'next/navigation';

type MainLayoutProps = {
  children: React.ReactNode;
};

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();
  const isIndividualChatPage = /^\/chat\/[^/]+$/.test(pathname);
  const isIndividualGroupPage = /^\/groups\/[^/]+$/.test(pathname);
  
  const hideNavBar = isIndividualChatPage || isIndividualGroupPage;
  
  return (
    <div className="flex min-h-screen flex-col">
      <main className={`flex-1 ${!hideNavBar ? 'pb-20' : ''}`}>{children}</main>
      {!hideNavBar && <BottomNavBar />}
    </div>
  );
}
