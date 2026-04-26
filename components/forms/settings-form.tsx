'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { Settings } from '@prisma/client';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { saveSettingsAction } from '@/lib/actions/settings-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { settingsSchema } from '@/lib/validations/settings';

export function SettingsForm({ settings }: { settings: Settings }) {
    const [isPending, startTransition] = useTransition();
    const form = useForm<z.input<typeof settingsSchema>, unknown, z.output<typeof settingsSchema>>({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            shopName: settings.shopName,
            address: settings.address,
            phone: settings.phone,
            receiptHeader: settings.receiptHeader ?? '',
            receiptFooter: settings.receiptFooter ?? '',
            currencyCode: 'LKR',
            currencySymbol: 'Rs.',
            receiptCopies: settings.receiptCopies,
        },
    });

    const onSubmit = form.handleSubmit((values) => {
        startTransition(async () => {
            const result = await saveSettingsAction(values);
            if (!result.success) {
                toast.error(result.error);
                return;
            }

            toast.success(result.message);
        });
    });

    return (
        <form className="grid gap-8 md:grid-cols-2" onSubmit={onSubmit}>
            <div className="space-y-2 md:col-span-2">
                <Label htmlFor="shopName">Shop name</Label>
                <Input id="shopName" {...form.register('shopName')} />
            </div>
            <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" {...form.register('address')} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" {...form.register('phone')} />
            </div>
            <div className="space-y-2">
                <Label>Currency</Label>
                <input type="hidden" {...form.register('currencyCode')} />
                <input type="hidden" {...form.register('currencySymbol')} />
                <Input value="Sri Lankan Rupee (LKR)" readOnly />
            </div>
            <div className="space-y-2">
                <Label htmlFor="receiptCopies">Receipt copies</Label>
                <Input id="receiptCopies" type="number" {...form.register('receiptCopies')} />
            </div>
            <div className="space-y-2 md:col-span-2">
                <Label htmlFor="receiptHeader">Receipt header</Label>
                <Textarea id="receiptHeader" {...form.register('receiptHeader')} />
            </div>
            <div className="space-y-2 md:col-span-2">
                <Label htmlFor="receiptFooter">Receipt footer</Label>
                <Textarea id="receiptFooter" {...form.register('receiptFooter')} />
            </div>
            <div className="flex justify-end md:col-span-2 mt-16">
                <Button type="submit" disabled={isPending}>
                    {isPending ? 'Saving...' : 'Save settings'}
                </Button>
            </div>
        </form>
    );
}
