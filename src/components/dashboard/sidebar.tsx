'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { LayoutDashboard, PenSquare, FileText, History, Settings, Mail, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const links = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/compose', label: 'Compose', icon: PenSquare },
  { href: '/templates', label: 'Templates', icon: FileText },
  { href: '/history', label: 'History', icon: History },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const navLinks = isAdmin ? [...links, { href: '/admin', label: 'Admin', icon: ShieldCheck }] : links;
  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:bg-card">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <img src="/logo.svg" alt="Penarreach" className="h-8 w-8 rounded-lg" />
        <span className="font-display text-lg font-semibold">
          Penarreach<span className="text-primary">.</span>
        </span>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navLinks.map((l) => {
          const active = pathname === l.href || pathname?.startsWith(l.href + '/');
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                'relative flex items-center gap-3 rounded-full px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'text-ink-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-full bg-ink"
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                />
              )}
              <l.icon className="relative z-10 h-4 w-4" />
              <span className="relative z-10">{l.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Mail className="h-3.5 w-3.5" /> Bulk email · personalised
        </div>
      </div>
    </aside>
  );
}
