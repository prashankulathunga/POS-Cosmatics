'use client';

import { Menu } from 'lucide-react';
import { useState } from 'react';

import { AppSidebar } from '@/components/layout/app-sidebar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { SessionUser } from '@/lib/types';

export function MobileSidebar({ session }: { session: SessionUser }) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="secondary" size="icon" className="lg:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Open navigation</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="left-0 top-0 h-screen max-w-[320px] translate-x-0 translate-y-0 rounded-none border-r p-3">
                <DialogTitle className="sr-only">Navigation</DialogTitle>
                <AppSidebar session={session} />
            </DialogContent>
        </Dialog>
    );
}
