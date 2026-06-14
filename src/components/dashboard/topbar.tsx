'use client';
import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

const titles: Record<string, string> = {
  '/dashboard': 'Overview',
  '/compose': 'Compose email',
  '/templates': 'Templates',
  '/history': 'Email history',
  '/settings': 'Settings',
  '/admin': 'Admin',
};

export function Topbar({ demoMode = false }: { demoMode?: boolean }) {
  const pathname = usePathname() ?? '';
  const title = Object.entries(titles).find(([k]) => pathname.startsWith(k))?.[1] ?? 'Penarreach';
  return (
    <header className="flex h-16 items-center justify-between border-b bg-background/80 backdrop-blur px-4 md:px-8 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="md:hidden">
          <Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button>
        </Link>
        <AnimatePresence mode="wait">
          <motion.h1
            key={title}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18 }}
            className="font-display text-lg font-semibold"
          >
            {title}
          </motion.h1>
        </AnimatePresence>
      </div>
      {demoMode ? (
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
          <User className="h-4 w-4" />
        </div>
      ) : (
        <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: 'h-9 w-9' } }} />
      )}
    </header>
  );
}
