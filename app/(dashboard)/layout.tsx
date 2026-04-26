import { DashboardShell } from '@/components/layout/dashboard-shell';
import { requireSession } from '@/lib/auth/session';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const session = await requireSession();

    return <DashboardShell session={session}>{children}</DashboardShell>;
}
