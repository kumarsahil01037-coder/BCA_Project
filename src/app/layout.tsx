import type { Metadata } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'sonner';
import './globals.css';

const DEMO_MODE = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  axes: ['opsz', 'SOFT', 'WONK'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Penarreach — Bulk email, personalised',
  description: 'Send personalised bulk email from Excel. Production-grade.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const content = (
    <html lang="en" suppressHydrationWarning className={`${fraunces.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-background antialiased">
        {DEMO_MODE && (
          <div className="bg-amber-500 text-amber-950 text-center text-xs font-medium py-1.5">
            🎬 DEMO MODE — auth bypassed, all data is local. Set DEMO_MODE=0 in .env to enable real Clerk.
          </div>
        )}
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );

  // In demo mode, don't mount ClerkProvider — it requires keys to initialise.
  if (DEMO_MODE) return content;

  return <ClerkProvider>{content}</ClerkProvider>;
}
