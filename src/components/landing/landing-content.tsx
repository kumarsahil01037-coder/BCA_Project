'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Sparkles,
  LayoutTemplate,
  Paperclip,
  Code2,
  FileSpreadsheet,
  ArrowRight,
  Mail,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FadeIn } from '@/components/motion/fade-in';

const bentoFeatures = [
  {
    icon: LayoutTemplate,
    title: 'Custom Template Builder',
    desc: 'Design beautiful layouts once. Use smart <<Variables>> to inject personalised text, links, and details for every individual recipient.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Excel-Native Workflow',
    desc: 'Upload an XLSX or CSV — Penarreach detects your email column and turns every header into a personalisation variable instantly.',
  },
  {
    icon: Paperclip,
    title: 'Dynamic Attachments',
    desc: 'Send unique files to unique people. Attach personalised invoices, proposals, or PDFs automatically based on your spreadsheet.',
  },
  {
    icon: Code2,
    title: 'Variable Subjects & Headers',
    desc: 'Grab attention before they even open the email. Inject names, companies, or offers directly into the subject line to boost open rates.',
    code: '<<Subject Line>>',
  },
];

const stats = [
  { value: 'XLSX', label: 'Native import' },
  { value: 'OAuth', label: 'Your own Gmail' },
  { value: 'AES-256', label: 'Token encryption' },
  { value: 'Live', label: 'Send tracking' },
];

export function LandingContent({
  primaryHref,
  secondaryHref,
  primaryLabel,
  secondaryLabel,
  demoMode,
}: {
  primaryHref: string;
  secondaryHref: string;
  primaryLabel: string;
  secondaryLabel: string;
  demoMode: boolean;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md"
      >
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Penarreach" className="h-9 w-9 rounded-lg" />
            <span className="text-xl font-semibold tracking-tight">Penarreach</span>
          </div>
          <nav className="flex items-center gap-3">
            {!demoMode && (
              <Button variant="ghost" asChild className="hidden sm:inline-flex">
                <Link href="/admin-sign-in">Admin sign in</Link>
              </Button>
            )}
            <Button variant="ghost" asChild>
              <Link href={secondaryHref}>{demoMode ? 'Dashboard' : 'User sign in'}</Link>
            </Button>
            <Button asChild className="transition-transform hover:scale-105 active:scale-95">
              <Link href={primaryHref}>{demoMode ? 'Open app' : 'Get started'}</Link>
            </Button>
          </nav>
        </div>
      </motion.header>

      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div
          className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full opacity-20 blur-3xl"
          style={{ background: 'hsl(var(--primary))' }}
        />
        <div className="container relative grid items-center gap-16 lg:grid-cols-2">
          <FadeIn>
            {!demoMode && (
              <Link
                href="/sign-in"
                className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Already have access? Sign in as a user →
              </Link>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              The new standard for personalised outreach
            </span>
            <h1 className="mt-6 text-5xl font-bold tracking-tight md:text-6xl">
              Personalise at scale.
              <br />
              <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                Captivate instantly.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              Send bulk emails with custom templates, dynamic attachments, and variable subject
              lines — tailored automatically for every single recipient on your list.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild className="transition-transform hover:scale-105 active:scale-95">
                <Link href={primaryHref} className="gap-2">
                  {primaryLabel} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="transition-transform hover:scale-105 active:scale-95">
                <Link href={secondaryHref}>{secondaryLabel}</Link>
              </Button>
            </div>
          </FadeIn>

          {/* Hero visual */}
          <FadeIn delay={0.15} className="relative mx-auto w-full max-w-md">
            <div
              className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-30 blur-2xl"
              style={{ background: 'hsl(var(--primary))' }}
            />
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="relative rounded-2xl border border-border bg-card p-5 shadow-xl"
            >
              <div className="mb-4 flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                  <span className="text-muted-foreground">To</span>
                  <code className="var-chip">&lt;&lt;Email&gt;&gt;</code>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                  <span className="text-muted-foreground">Subject</span>
                  <span className="truncate text-right text-xs">
                    Hi <code className="var-chip">&lt;&lt;FirstName&gt;&gt;</code>, quick update
                  </span>
                </div>
                <div className="space-y-2 rounded-lg border border-border p-3">
                  <div className="h-2 w-full rounded-full bg-muted" />
                  <div className="h-2 w-5/6 rounded-full bg-muted" />
                  <div className="h-2 w-2/3 rounded-full bg-muted" />
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground">
                    <Paperclip className="h-3 w-3" /> proposal_<code className="text-primary">&lt;&lt;Company&gt;&gt;</code>.pdf
                  </div>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 260, damping: 20 }}
              className="absolute -bottom-6 -left-6 flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 shadow-lg"
            >
              <div className="grid h-8 w-8 place-items-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold leading-tight">1,248 sent</div>
                <div className="text-xs text-muted-foreground leading-tight">Live tracking</div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.65, type: 'spring', stiffness: 260, damping: 20 }}
              className="absolute -right-4 -top-4 grid h-12 w-12 place-items-center rounded-2xl border border-border bg-primary text-primary-foreground shadow-lg"
            >
              <Mail className="h-5 w-5" />
            </motion.div>
          </FadeIn>
        </div>

        {/* Stat strip */}
        <div className="container relative mt-20">
          <FadeIn delay={0.2} className="mx-auto grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-card py-5 text-center shadow-sm">
                <div className="text-2xl font-bold text-primary">{s.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </FadeIn>
        </div>
      </section>

      {/* Feature sections */}
      <section className="container py-20 md:py-28">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Everything you need. <span className="text-muted-foreground">Nothing you don&apos;t.</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Every feature is built around one goal: making bulk email feel like a one-to-one conversation.
          </p>
        </FadeIn>

        <div className="mx-auto mt-16 max-w-5xl space-y-20">
          {bentoFeatures.map((f, i) => (
            <FadeIn
              key={f.title}
              className={`grid items-center gap-10 md:grid-cols-2 ${i % 2 === 1 ? 'md:[direction:rtl]' : ''}`}
            >
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                className="relative grid h-56 place-items-center rounded-2xl border border-border bg-card shadow-sm md:[direction:ltr]"
              >
                <div
                  className="pointer-events-none absolute h-32 w-32 rounded-full opacity-20 blur-2xl"
                  style={{ background: 'hsl(var(--primary))' }}
                />
                <div className="grid h-20 w-20 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <f.icon className="h-9 w-9" />
                </div>
              </motion.div>
              <div className="md:[direction:ltr]">
                <h3 className="text-2xl font-semibold">{f.title}</h3>
                <p className="mt-3 max-w-md text-muted-foreground">{f.desc}</p>
                {f.code && (
                  <code className="mt-4 inline-block rounded-md bg-muted px-2.5 py-1 text-sm text-primary">
                    {f.code}
                  </code>
                )}
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-primary py-20 text-primary-foreground md:py-28">
        <div className="container">
          <FadeIn className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Ready to scale your outreach?</h2>
            <p className="mt-4 text-primary-foreground/80">
              Connect your Gmail, upload a spreadsheet, and send your first personalised batch in minutes.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                variant="secondary"
                asChild
                className="transition-transform hover:scale-105 active:scale-95"
              >
                <Link href={primaryHref} className="gap-2">
                  {primaryLabel} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-primary-foreground/30 bg-transparent text-primary-foreground transition-transform hover:scale-105 hover:bg-primary-foreground/10 active:scale-95"
              >
                <Link href={secondaryHref}>{secondaryLabel}</Link>
              </Button>
            </div>
          </FadeIn>
        </div>
      </section>

      <footer className="border-t border-border bg-card">
        <div className="container flex flex-col items-center justify-between gap-4 py-8 sm:flex-row">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Penarreach" className="h-7 w-7 rounded-lg" />
            <span className="font-semibold tracking-tight">Penarreach</span>
          </div>
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Penarreach</p>
        </div>
      </footer>
    </div>
  );
}
