'use client';

import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const AppSidebarButton = ({
    collapsed = false,
    href,
    icon: Icon,
    title,
}: {
    collapsed?: boolean;
    href: string;
    icon: LucideIcon;
    title: string;
}) => {
    const pathname = usePathname();
    const isActive = pathname === href || pathname.startsWith(`${href}/`);

    return (
        <Button
            variant="ghost"
            asChild
            className={cn(
                'inline-flex w-full',
                collapsed ? 'justify-center px-0' : 'justify-start',
            )}
        >
            <Link
                href={href}
                title={title}
                className={cn(
                    'flex items-center rounded-xl text-sm font-medium transition-colors',
                    collapsed ? 'h-11 w-11 justify-center px-0' : 'gap-3 px-3 py-2.5',
                    isActive
                        ? 'bg-[#f8b8bb]/40 text-white hover:text-foreground'
                        : 'text-[#ecafb2] hover:bg-[#f8b8bb]/40',
                )}
            >
                <Icon className="h-4 w-4 shrink-0" />
                <span className={cn(collapsed && 'sr-only')}>{title}</span>
            </Link>
        </Button>
    );
};
