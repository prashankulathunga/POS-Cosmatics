'use client';

import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react';

import { LogoutButton } from '@/components/layout/logout-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NAV_ITEMS } from '@/lib/constants';
import type { SessionUser } from '@/lib/types';
import { cn } from '@/lib/utils';
import { AppSidebarButton } from '@/components/layout/app-sidebar-button';

export function AppSidebar({
    collapsed = false,
    onToggle,
    session,
}: {
    collapsed?: boolean;
    onToggle?: () => void;
    session: SessionUser;
}) {
    return (
        <aside
            className={cn(
                'flex min-h-[97svh] w-full flex-col rounded-2xl border border-[#f8b8bb]/20 bg-white transition-all duration-300',
                collapsed ? 'p-3 flex flex-col items-center justify-between' : 'p-4',
            )}
        >
            <div
                className={cn(
                    'mt-1 rounded-xl text-white transition-all duration-300',
                    collapsed
                        ? 'px-2 py-2 bg-white'
                        : 'p-5 bg-[linear-gradient(135deg,#34495e,#f8b8bb)]',
                )}
            >
                <div
                    className={cn(
                        'flex items-start gap-3',
                        collapsed ? 'flex-col items-center' : 'justify-between',
                    )}
                >
                    <div className={cn(collapsed && 'text-center')}>
                        <p
                            className={cn(
                                'text-xs uppercase tracking-[0.25em] text-emerald-100',
                                collapsed && 'sr-only',
                            )}
                        >
                            Retail POS
                        </p>
                        <h1
                            className={`${collapsed ? 'hidden' : 'text-xl mt-2 text-[#f9f9f9]'} font-bold `}
                        >
                            BLISSORA
                        </h1>
                    </div>

                    {onToggle ? (
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`hidden border-0 bg-transparent shadow-none hover:bg-white/15 lg:inline-flex ${collapsed ? 'w-full' : null}`}
                            onClick={onToggle}
                        >
                            {collapsed ? (
                                <ChevronRight className="h-4 w-4 text-gray-600" />
                            ) : (
                                <ChevronLeft className="h-4 w-4 text-white" />
                            )}
                            {/* <span className="sr-only">
                                {collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                            </span> */}
                        </Button>
                    ) : null}
                </div>

                <div className={cn('mt-4', collapsed && '')}>
                    <Badge variant={collapsed ? 'destructive' : 'secondary'}>
                        {collapsed ? session.role.slice(0, 1) : session.role}
                    </Badge>
                </div>
            </div>

            <nav className={cn('mt-8 flex flex-1 flex-col gap-1', collapsed && 'items-center')}>
                {NAV_ITEMS.filter((item) => item.roles.includes(session.role)).map((item) => {
                    if (item.href === '/logout') {
                        return (
                            <LogoutButton
                                key={item.href}
                                className={cn('mt-auto w-full', collapsed && 'justify-center px-0')}
                            >
                                <LogOut className="w-4 h-4" />
                                <span className={cn(collapsed && 'sr-only')}>Logout</span>
                            </LogoutButton>
                        );
                    }

                    return (
                        <AppSidebarButton
                            key={item.href}
                            collapsed={collapsed}
                            href={item.href}
                            icon={item.icon}
                            title={item.title}
                        />
                    );
                })}
            </nav>
        </aside>
    );
}
