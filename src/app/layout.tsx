import './globals.css';
import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import './globals.css';
import TanStackQueryProvider from '@/lib/query/query-client';
import Prefetcher from '@/components/Prefetcher';
import AppShell from '@/components/layout/AppShell';
import { SocketProvider } from '@/lib/hooks/useSocket';

// Load DM Sans font with all weights and styles
const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-sans',
  weight: ['400', '500', '600', '700']
});

export const metadata: Metadata = {
  title: 'CheckIn - Event Registration System',
  description: 'A modern, secure check-in and registration system for events',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={dmSans.className}>
        <div className="min-h-screen flex flex-col">
          <TanStackQueryProvider>
            <Prefetcher>
              <SocketProvider>
                <AppShell>
                  {children}
                </AppShell>
              </SocketProvider>
            </Prefetcher>
          </TanStackQueryProvider>
        </div>
      </body>
    </html>
  );
}
