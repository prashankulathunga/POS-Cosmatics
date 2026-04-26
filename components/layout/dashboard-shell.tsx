'use client';

import { useEffect, useState } from 'react';

import { AppSidebar } from '@/components/layout/app-sidebar';
import { Topbar } from '@/components/layout/topbar';
import type { SessionUser } from '@/lib/types';
import { cn } from '@/lib/utils';

const SIDEBAR_STORAGE_KEY = 'dashboard-sidebar-collapsed';

export function DashboardShell({
    children,
    session,
}: {
    children: React.ReactNode;
    session: SessionUser;
}) {
    const [collapsed, setCollapsed] = useState(() => {
        if (typeof window === 'undefined') {
            return true;
        }

        return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
    });

    useEffect(() => {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
    }, [collapsed]);

    return (
        <div className="min-h-screen p-4">
            <div className="mx-auto flex gap-2">
                <div
                    className={cn(
                        'relative hidden shrink-0 transition-[width] duration-300 ease-out lg:block',
                        collapsed ? 'w-15' : 'w-72',
                    )}
                >
                    <div className="sticky top-4">
                        <AppSidebar
                            collapsed={collapsed}
                            onToggle={() => setCollapsed((current) => !current)}
                            session={session}
                        />
                    </div>
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                    <Topbar session={session} />
                    <main className="space-y-4">{children}</main>
                </div>
            </div>
        </div>
    );
}
