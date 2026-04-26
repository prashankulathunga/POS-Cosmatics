import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth/session';
import { lookupReturnableSale } from '@/lib/services/returns';

export async function GET(request: Request) {
    const session = await getSession();

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const invoice = searchParams.get('invoice');

    if (!invoice) {
        return NextResponse.json({ error: 'Invoice number is required' }, { status: 400 });
    }

    const sale = await lookupReturnableSale(invoice);

    if (!sale) {
        return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    return NextResponse.json({ sale });
}
