import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth/session';
import { getProductByBarcode, getProductOptions } from '@/lib/services/products';

export async function GET(request: Request) {
    const session = await getSession();

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query')?.trim();
    const barcode = searchParams.get('barcode')?.trim();
    const limit = Number(searchParams.get('limit') ?? '24');

    if (barcode) {
        const product = await getProductByBarcode(barcode);
        return NextResponse.json({ items: product ? [product] : [] });
    }

    const items = await getProductOptions(query, Math.min(Math.max(limit, 1), 48));
    return NextResponse.json({ items });
}
