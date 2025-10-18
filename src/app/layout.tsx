
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { UnreadCountProvider } from '@/context/UnreadCountContext';
import { CallProvider } from '@/context/CallContext';

export const metadata: Metadata = {
  title: 'Global Dating Chat',
  description: 'Connect with people around the world.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <UnreadCountProvider>
        <CallProvider>
            {children}
        </CallProvider>
        <Toaster />
        </UnreadCountProvider>
      </body>
    </html>
  );
}
