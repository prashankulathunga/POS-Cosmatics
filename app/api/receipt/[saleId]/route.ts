import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth/session';
import { getSaleById } from '@/lib/services/sales';
import { getSettings } from '@/lib/services/settings';

export async function GET(_: Request, { params }: { params: Promise<{ saleId: string }> }) {
    const session = await getSession();

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { saleId } = await params;
    const [sale, settings] = await Promise.all([getSaleById(saleId), getSettings()]);

    if (!sale) {
        return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    return NextResponse.json({ sale, settings });
}
