import 'server-only';

import { cache } from 'react';

import { SETTINGS_ID } from '@/lib/constants';
import { prisma } from '@/lib/db/prisma';
import { settingsSchema, type SettingsInput } from '@/lib/validations/settings';

export const getSettings = cache(async () => {
    const settings = await prisma.settings.findUnique({
        where: { id: SETTINGS_ID },
    });

    if (settings) {
        if (settings.currencyCode !== 'LKR' || settings.currencySymbol !== 'Rs.') {
            return prisma.settings.update({
                where: { id: SETTINGS_ID },
                data: {
                    currencyCode: 'LKR',
                    currencySymbol: 'Rs.',
                },
            });
        }

        return settings;
    }

    return prisma.settings.create({
        data: {
            id: SETTINGS_ID,
            shopName: 'BLISSORA',
            address: '123 Main Street',
            phone: '+1 555-0100',
            receiptHeader: 'Thanks for shopping with us',
            receiptFooter: 'Goods once sold can be returned within policy period',
            currencyCode: 'LKR',
            currencySymbol: 'Rs.',
            receiptCopies: 1,
        },
    });
});

export async function saveSettings(input: SettingsInput) {
    const values = settingsSchema.parse({
        ...input,
        currencyCode: 'LKR',
        currencySymbol: 'Rs.',
    });

    return prisma.settings.upsert({
        where: { id: SETTINGS_ID },
        update: values,
        create: {
            id: SETTINGS_ID,
            ...values,
        },
    });
}
