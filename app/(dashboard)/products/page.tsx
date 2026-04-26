import { Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';

import { ProductFormDialog } from '@/components/forms/product-form-dialog';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { deleteProductAction } from '@/lib/actions/product-actions';
import { requireRole } from '@/lib/auth/session';
import { listProducts } from '@/lib/services/products';
import { formatCurrency } from '@/lib/utils';
import { getSettings } from '@/lib/services/settings';

export default async function ProductsPage({
    searchParams,
}: {
    searchParams: Promise<{ query?: string; page?: string; categoryId?: string }>;
}) {
    await requireRole(['ADMIN']);
    const params = await searchParams;
    const [settings, productData] = await Promise.all([
        getSettings(),
        listProducts({
            query: params.query,
            page: Number(params.page ?? '1'),
            categoryId: params.categoryId,
        }),
    ]);

    return (
        <div className="space-y-2">
            <PageHeader
                title="Products"
                description="Manage catalog items, pricing, stock thresholds, and barcode assignments."
                actions={
                    <ProductFormDialog
                        categories={productData.categories}
                        trigger={
                            <Button>
                                <Plus className="h-4 w-4" />
                                Add product
                            </Button>
                        }
                    />
                }
            />

            <Card>
                <CardContent className="space-y-4 p-6">
                    <form className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
                        <Input
                            name="query"
                            placeholder="Search by name or barcode"
                            defaultValue={params.query}
                        />
                        <Input
                            name="categoryId"
                            placeholder="Category ID filter"
                            defaultValue={params.categoryId}
                        />
                        <Button type="submit" variant="secondary">
                            Filter
                        </Button>
                    </form>

                    <div className="rounded-2xl border border-slate-100">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Barcode</TableHead>
                                    <TableHead>Stock</TableHead>
                                    <TableHead>Selling</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {productData.items.map((product) => (
                                    <TableRow key={product.id} className="content-auto">
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{product.name}</p>
                                                <p className="text-xs text-slate-500">
                                                    {product.category?.name ?? 'No category'}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell>{product.barcode}</TableCell>
                                        <TableCell>
                                            {product.stockQuantity} / low at {product.lowStockLimit}
                                        </TableCell>
                                        <TableCell>
                                            {formatCurrency(
                                                Number(product.sellingPrice),
                                                settings.currencyCode,
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {product.isActive ? 'Active' : 'Inactive'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <ProductFormDialog
                                                    product={product}
                                                    categories={productData.categories}
                                                    trigger={
                                                        <Button variant="outline">Edit</Button>
                                                    }
                                                />
                                                <form
                                                    action={async () => {
                                                        'use server';
                                                        await deleteProductAction(product.id);
                                                    }}
                                                >
                                                    <Button variant="ghost" size="icon">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </form>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        <span>
                            Page {productData.page} of {productData.totalPages} •{' '}
                            {productData.totalCount} products
                        </span>
                        <div className="flex gap-2">
                            <Button asChild variant="outline">
                                <Link
                                    aria-disabled={productData.page <= 1}
                                    className={
                                        productData.page <= 1
                                            ? 'pointer-events-none opacity-50'
                                            : ''
                                    }
                                    href={`?query=${encodeURIComponent(params.query ?? '')}&categoryId=${encodeURIComponent(params.categoryId ?? '')}&page=${Math.max(productData.page - 1, 1)}`}
                                >
                                    Previous
                                </Link>
                            </Button>
                            <Button asChild variant="outline">
                                <Link
                                    aria-disabled={productData.page >= productData.totalPages}
                                    className={
                                        productData.page >= productData.totalPages
                                            ? 'pointer-events-none opacity-50'
                                            : ''
                                    }
                                    href={`?query=${encodeURIComponent(params.query ?? '')}&categoryId=${encodeURIComponent(params.categoryId ?? '')}&page=${Math.min(productData.page + 1, productData.totalPages)}`}
                                >
                                    Next
                                </Link>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
