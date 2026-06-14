import { Sidebar } from '@/components/dashboard/sidebar';
import { Topbar } from '@/components/dashboard/topbar';
import { PageTransition } from '@/components/motion/page-transition';
import { getCurrentUser } from '@/lib/auth/get-user';

const DEMO_MODE = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar isAdmin={user?.role === 'ADMIN'} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar demoMode={DEMO_MODE} />
        <main className="flex-1 p-4 md:p-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
