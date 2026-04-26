'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { processReturnAction } from '@/lib/actions/return-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatDateTime } from '@/lib/utils';

type ReturnableSale = {
    id: string;
    invoiceNumber: string;
    createdAt: string;
    cashier: {
        fullName: string;
    };
    items: Array<{
        id: string;
        productNameSnapshot: string;
        productBarcodeSnapshot: string;
        quantity: number;
        returnedQty: number;
        remainingQty: number;
        refundableUnitPrice: number;
    }>;
};

export function ReturnsManager({ currencyCode }: { currencyCode: string }) {
    const [invoice, setInvoice] = useState('');
    const [sale, setSale] = useState<ReturnableSale | null>(null);
    const [reason, setReason] = useState('');
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [isPending, startTransition] = useTransition();

    async function lookupSale() {
        const invoiceNumber = invoice.trim();

        if (!invoiceNumber) {
            toast.error('Scan receipt barcode or enter invoice number');
            return;
        }

        const response = await fetch(
            `/api/sales/lookup?invoice=${encodeURIComponent(invoiceNumber)}`,
        );
        const payload = await response.json();

        if (!response.ok) {
            toast.error(payload.error ?? 'Sale not found');
            setSale(null);
            return;
        }

        setSale(payload.sale);
        setQuantities(
            Object.fromEntries(
                payload.sale.items.map((item: ReturnableSale['items'][number]) => [item.id, 0]),
            ),
        );
    }

    function updateQuantity(saleItemId: string, value: string, remainingQty: number) {
        const parsed = Math.max(0, Math.min(Number(value || '0'), remainingQty));
        setQuantities((current) => ({
            ...current,
            [saleItemId]: parsed,
        }));
    }

    function submitReturn() {
        if (!sale) {
            return;
        }

        const items = Object.entries(quantities)
            .filter(([, quantity]) => quantity > 0)
            .map(([saleItemId, quantity]) => ({
                saleItemId,
                quantity,
            }));

        if (items.length === 0) {
            toast.error('Choose at least one item to return');
            return;
        }

        startTransition(async () => {
            const result = await processReturnAction({
                saleId: sale.id,
                reason,
                items,
            });

            if (!result.success) {
                toast.error(result.error);
                return;
            }

            toast.success(result.message);
            setSale(null);
            setReason('');
            setQuantities({});
            setInvoice('');
        });
    }

    const refundEstimate = sale
        ? sale.items.reduce(
              (sum, item) => sum + (quantities[item.id] ?? 0) * item.refundableUnitPrice,
              0,
          )
        : 0;

    return (
        <div className="grid gap-2 xl:grid-cols-[380px_minmax(0,1fr)]">
            <Card>
                <CardHeader>
                    <CardTitle>Find Sale</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Input
                        autoComplete="off"
                        autoFocus
                        inputMode="search"
                        placeholder="Scan receipt barcode or enter invoice"
                        spellCheck={false}
                        value={invoice}
                        onChange={(event) => setInvoice(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                startTransition(async () => lookupSale());
                            }
                        }}
                    />
                    <Button
                        className="w-full"
                        onClick={() => startTransition(async () => lookupSale())}
                        disabled={isPending}
                    >
                        Search invoice
                    </Button>
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                        Full and partial returns are supported. Stock is only restored after the
                        return is saved successfully.
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Return Items</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {!sale ? (
                        <p className="text-sm text-slate-500">
                            Search by invoice number to load returnable items.
                        </p>
                    ) : (
                        <>
                            <div className="rounded-2xl bg-slate-50 p-4">
                                <p className="font-medium text-slate-900">{sale.invoiceNumber}</p>
                                <p className="text-sm text-slate-500">
                                    {sale.cashier.fullName} • {formatDateTime(sale.createdAt)}
                                </p>
                            </div>

                            <div className="space-y-3">
                                {sale.items.map((item) => (
                                    <div
                                        key={item.id}
                                        className="rounded-2xl border border-slate-200 p-4"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="font-medium text-slate-900">
                                                    {item.productNameSnapshot}
                                                </p>
                                                <p className="text-sm text-slate-500">
                                                    {item.productBarcodeSnapshot}
                                                </p>
                                            </div>
                                            <div className="text-right text-sm text-slate-500">
                                                <p>Sold: {item.quantity}</p>
                                                <p>Returned: {item.returnedQty}</p>
                                                <p>Remaining: {item.remainingQty}</p>
                                            </div>
                                        </div>
                                        <div className="mt-3 flex items-center gap-3">
                                            <Input
                                                type="number"
                                                min={0}
                                                max={item.remainingQty}
                                                value={quantities[item.id] ?? 0}
                                                onChange={(event) =>
                                                    updateQuantity(
                                                        item.id,
                                                        event.target.value,
                                                        item.remainingQty,
                                                    )
                                                }
                                                className="w-28"
                                            />
                                            <span className="text-sm text-slate-500">
                                                {formatCurrency(
                                                    item.refundableUnitPrice,
                                                    currencyCode,
                                                )}{' '}
                                                each
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <Input
                                placeholder="Return reason (optional)"
                                value={reason}
                                onChange={(event) => setReason(event.target.value)}
                            />
                            <div className="flex items-center justify-between rounded-2xl bg-emerald-50 p-4">
                                <div>
                                    <p className="text-sm text-emerald-700">Estimated refund</p>
                                    <p className="text-2xl font-semibold text-emerald-900">
                                        {formatCurrency(refundEstimate, currencyCode)}
                                    </p>
                                </div>
                                <Button onClick={submitReturn} disabled={isPending}>
                                    {isPending ? 'Saving...' : 'Complete return'}
                                </Button>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
