import { PackagePlus } from 'lucide-react';
import Link from 'next/link';

import { StockAdjustmentDialog } from '@/components/forms/stock-adjustment-dialog';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { requireRole } from '@/lib/auth/session';
import { listInventory } from '@/lib/services/inventory';
import { formatDateTime } from '@/lib/utils';

export default async function InventoryPage({
    searchParams,
}: {
    searchParams: Promise<{ query?: string; page?: string }>;
}) {
    await requireRole(['ADMIN']);
    const params = await searchParams;
    const data = await listInventory({
        query: params.query,
        page: Number(params.page ?? '1'),
    });

    return (
        <div className="space-y-2">
            <PageHeader
                title="Inventory"
                description="Review stock levels, manual adjustments, and movement history."
            />

            <div className="grid gap-2 xl:grid-cols-[minmax(0,1.2fr)_420px]">
                <Card>
                    <CardContent className="space-y-4 p-6">
                        <form>
                            <Input
                                name="query"
                                placeholder="Search stock by product or barcode"
                                defaultValue={params.query}
                            />
                        </form>
                        <div className="rounded-2xl border border-slate-100">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Barcode</TableHead>
                                        <TableHead>Stock</TableHead>
                                        <TableHead className="text-right">Adjust</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.products.map((product) => (
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
                                                <div className="flex items-center gap-2">
                                                    <span>{product.stockQuantity}</span>
                                                    {product.stockQuantity <=
                                                    product.lowStockLimit ? (
                                                        <Badge variant="warning">Low</Badge>
                                                    ) : null}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <StockAdjustmentDialog
                                                    product={product}
                                                    trigger={
                                                        <Button variant="outline">
                                                            <PackagePlus className="h-4 w-4" />
                                                            Adjust
                                                        </Button>
                                                    }
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                            <span>
                                Page {data.page} of {data.totalPages} • {data.totalCount} stock
                                items • {data.lowStockCount} low stock
                            </span>
                            <div className="flex gap-2">
                                <Button asChild variant="outline">
                                    <Link
                                        aria-disabled={data.page <= 1}
                                        className={
                                            data.page <= 1 ? 'pointer-events-none opacity-50' : ''
                                        }
                                        href={`?query=${encodeURIComponent(params.query ?? '')}&page=${Math.max(data.page - 1, 1)}`}
                                    >
                                        Previous
                                    </Link>
                                </Button>
                                <Button asChild variant="outline">
                                    <Link
                                        aria-disabled={data.page >= data.totalPages}
                                        className={
                                            data.page >= data.totalPages
                                                ? 'pointer-events-none opacity-50'
                                                : ''
                                        }
                                        href={`?query=${encodeURIComponent(params.query ?? '')}&page=${Math.min(data.page + 1, data.totalPages)}`}
                                    >
                                        Next
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Recent Stock Movements</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {data.movements.map((movement) => (
                            <div
                                key={movement.id}
                                className="content-auto rounded-2xl border border-slate-200 p-4"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <p className="font-medium text-slate-900">
                                        {movement.product.name}
                                    </p>
                                    <Badge
                                        variant={
                                            movement.quantityChange < 0 ? 'destructive' : 'default'
                                        }
                                    >
                                        {movement.quantityChange > 0
                                            ? `+${movement.quantityChange}`
                                            : movement.quantityChange}
                                    </Badge>
                                </div>
                                <p className="mt-1 text-sm text-slate-500">
                                    {movement.type} • {formatDateTime(movement.createdAt)}
                                </p>
                                <p className="mt-1 text-sm text-slate-600">
                                    {movement.stockBefore} to {movement.stockAfter}
                                </p>
                                {movement.note ? (
                                    <p className="mt-2 text-sm text-slate-500">{movement.note}</p>
                                ) : null}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
