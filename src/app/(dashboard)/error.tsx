'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useClerk } from '@clerk/nextjs';
import { toast } from 'sonner';

export default function DashboardError({ error }: { error: Error & { digest?: string } }) {
  const { signOut } = useClerk();
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (error.message !== 'ACCESS_DENIED' || handled.current) return;
    handled.current = true;

    toast.error('Access denied', {
      description: "This email hasn't been granted access to Penarreach.",
      duration: 1500,
    });

    const timer = setTimeout(() => {
      signOut(() => router.replace('/sign-in'));
    }, 1000);

    return () => clearTimeout(timer);
  }, [error, signOut, router]);

  if (error.message === 'ACCESS_DENIED') {
    return <div className="min-h-screen" />;
  }

  throw error;
}
