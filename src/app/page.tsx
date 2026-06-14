import { LandingContent } from '@/components/landing/landing-content';

const DEMO_MODE = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

export default function HomePage() {
  const primaryHref = DEMO_MODE ? '/dashboard' : '/sign-up';
  const secondaryHref = DEMO_MODE ? '/dashboard' : '/sign-in';
  const primaryLabel = DEMO_MODE ? 'Open demo dashboard' : 'Start free';
  const secondaryLabel = DEMO_MODE ? 'Compose an email' : 'I have an account';

  return (
    <LandingContent
      primaryHref={primaryHref}
      secondaryHref={secondaryHref}
      primaryLabel={primaryLabel}
      secondaryLabel={secondaryLabel}
      demoMode={DEMO_MODE}
    />
  );
}
