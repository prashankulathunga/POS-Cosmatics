import { CalendarCheck2 } from 'lucide-react';
import { MobileSidebar } from '@/components/layout/mobile-sidebar';
import { Badge } from '@/components/ui/badge';
import type { SessionUser } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

export function Topbar({ session }: { session: SessionUser }) {
    return (
        <header className="sticky z-20 top-4">
            <div className="flex flex-col gap-4 px-4 py-4 rounded-md lg:flex-row lg:items-center lg:justify-between bg-[linear-gradient(135deg,#ffffff,#f8b8bb30)] backdrop-blur-3xl">
                <div className="flex items-center gap-3">
                    <MobileSidebar session={session} />
                    <div>
                        <h2 className="text-base font-medium text-slate-600">
                            {' '}
                            Welcome Back, {session.fullName}
                        </h2>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Badge variant="default" className="gap-2">
                        <CalendarCheck2 className="h-3.5 w-3.5" />
                        {formatDateTime(new Date(), 'dd MMM yyyy')}
                    </Badge>
                </div>
            </div>
        </header>
    );
}
