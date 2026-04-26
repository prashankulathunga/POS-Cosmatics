'use server';

import { revalidatePath } from 'next/cache';

import { requireRole } from '@/lib/auth/session';
import { deleteProduct, saveProduct } from '@/lib/services/products';
import type { ActionResult } from '@/lib/actions/types';
import type { ProductInput } from '@/lib/validations/product';

export async function saveProductAction(input: ProductInput): Promise<ActionResult> {
    await requireRole(['ADMIN']);

    try {
        await saveProduct(input);
        revalidatePath('/products');
        revalidatePath('/inventory');
        revalidatePath('/pos');

        return {
            success: true,
            message: input.id ? 'Product updated' : 'Product created',
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unable to save product',
        };
    }
}

export async function deleteProductAction(productId: string): Promise<ActionResult> {
    await requireRole(['ADMIN']);

    try {
        const product = await deleteProduct(productId);
        revalidatePath('/products');
        revalidatePath('/inventory');
        revalidatePath('/pos');

        return {
            success: true,
            message:
                'isActive' in product && product.isActive === false
                    ? 'Product had history, so it was deactivated instead of deleted'
                    : 'Product deleted',
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unable to delete product',
        };
    }
}
