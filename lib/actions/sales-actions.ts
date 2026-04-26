'use server';

import { revalidatePath } from 'next/cache';

import { requireRole } from '@/lib/auth/session';
import type { ActionResult } from '@/lib/actions/types';
import { completeSale } from '@/lib/services/sales';
import type { SaleInput } from '@/lib/validations/sale';

export async function completeSaleAction(
    input: SaleInput,
): Promise<ActionResult<{ saleId: string }>> {
    const session = await requireRole(['ADMIN', 'CASHIER']);

    try {
        const sale = await completeSale(input, session.id);
        revalidatePath('/dashboard');
        revalidatePath('/pos');
        revalidatePath('/inventory');
        revalidatePath('/reports');
        revalidatePath('/returns');

        return {
            success: true,
            message: 'Sale completed',
            data: {
                saleId: sale.id,
            },
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unable to complete sale',
        };
    }
}
