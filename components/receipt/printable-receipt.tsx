'use client';

import JsBarcode from 'jsbarcode';
import { Fragment, forwardRef, memo, useEffect, useMemo, useRef } from 'react';

import { formatDateTime, toMoney } from '@/lib/utils';

export type ReceiptPayload = {
    sale: {
        invoiceNumber: string;
        createdAt: string;
        paymentMethod: string;
        subtotal: string | number;
        itemDiscount?: string | number | null;
        cartDiscount?: string | number | null;
        total: string | number;
        paidAmount: string | number;
        balance: string | number;
        note?: string | null;
        cashier: {
            fullName: string;
        };
        items: Array<{
            id: string;
            productNameSnapshot: string;
            quantity: number;
            sellingPriceSnapshot: string | number;
            discountAmount: string | number;
            lineTotal: string | number;
        }>;
    };
    settings: {
        shopName: string;
        address: string;
        phone: string;
        receiptHeader?: string | null;
        receiptFooter?: string | null;
        currencyCode: string;
    };
};

type PrintableReceiptProps = {
    data: ReceiptPayload | null;
};

type ReceiptSummaryRow = {
    label: string;
    value: string;
};

const DEFAULT_RECEIPT_SHOP_NAME = 'BLISSORA';

const RECEIPT_PAGE_STYLE = `
@page {
    size: 2.8in 200in;
    margin: 0;
}

@media print {
    html,
    body {
        background: #ffffff !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 2.8in !important;
    }

    .printable-receipt {
        padding-top: 8px !important;
        box-shadow: none !important;
        margin: 0 !important;
        width: 2.8in !important;
        min-height: auto !important;
        height: auto !important;
        overflow: visible !important;
    }

    .printable-receipt,
    .printable-receipt * {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }

    table,
    tr,
    td,
    th {
        page-break-inside: avoid;
        break-inside: avoid;
    }
}
`;

function cleanReceiptText(value: string | null | undefined) {
    return (value ?? '')
        .replace(/\u00a0/g, ' ')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim();
}

function cleanInlineText(value: string | null | undefined, fallback = '-') {
    const text = cleanReceiptText(value).replace(/\s+/g, ' ');

    if (text === '') {
        return fallback;
    }

    return text;
}

function getReceiptShopName(shopName: string) {
    const cleanShopName = cleanInlineText(shopName, DEFAULT_RECEIPT_SHOP_NAME);

    if (!cleanShopName) {
        return DEFAULT_RECEIPT_SHOP_NAME;
    }

    return cleanShopName;
}

function formatLabel(value: string) {
    return cleanInlineText(value)
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function makeCurrencyFormatter(currencyCode: string) {
    const currency = currencyCode === 'LKR' ? currencyCode : 'LKR';
    const options: Intl.NumberFormatOptions = {
        style: 'currency',
        currency,
        currencyDisplay: 'narrowSymbol',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    };

    try {
        return new Intl.NumberFormat('en-LK', options);
    } catch {
        return new Intl.NumberFormat('en-LK', { ...options, currency: 'LKR' });
    }
}

export const PrintableReceipt = memo(
    forwardRef<HTMLDivElement, PrintableReceiptProps>(function PrintableReceipt({ data }, ref) {
        const barcodeRef = useRef<SVGSVGElement | null>(null);
        const invoiceNumber = data?.sale.invoiceNumber ?? '';
        const currencyCode =
            data?.settings.currencyCode === 'LKR' ? data.settings.currencyCode : 'LKR';
        const moneyFormatter = useMemo(() => makeCurrencyFormatter(currencyCode), [currencyCode]);

        useEffect(() => {
            if (!barcodeRef.current || !invoiceNumber) {
                return;
            }

            try {
                JsBarcode(barcodeRef.current, invoiceNumber, {
                    format: 'CODE128',
                    displayValue: false,
                    height: 54,
                    margin: 6,
                    width: 1,
                });
            } catch (error) {
                console.error('Unable to render receipt barcode', error);
            }
        }, [invoiceNumber]);

        const receipt = useMemo(() => {
            if (!data) {
                return null;
            }

            const formatMoney = (value: number | string) => moneyFormatter.format(toMoney(value));
            const subtotal = toMoney(data.sale.subtotal);
            const itemDiscount = toMoney(data.sale.itemDiscount ?? 0);
            const cartDiscount = toMoney(data.sale.cartDiscount ?? 0);
            const total = toMoney(data.sale.total);
            const fallbackDiscount =
                itemDiscount > 0 || cartDiscount > 0 ? 0 : Math.max(0, toMoney(subtotal - total));
            const summaryRows: ReceiptSummaryRow[] = [
                {
                    label: 'Subtotal',
                    value: formatMoney(subtotal),
                },
            ];

            if (itemDiscount > 0) {
                summaryRows.push({
                    label: 'Item Discount',
                    value: formatMoney(-itemDiscount),
                });
            }

            if (cartDiscount > 0) {
                summaryRows.push({
                    label: 'Cart Discount',
                    value: formatMoney(-cartDiscount),
                });
            }

            if (fallbackDiscount > 0) {
                summaryRows.push({
                    label: 'Discount',
                    value: formatMoney(-fallbackDiscount),
                });
            }

            const items = data.sale.items.map((item) => {
                const rate = toMoney(item.sellingPriceSnapshot);
                const quantity = Number.isFinite(item.quantity) ? item.quantity : 0;
                const grossAmount = toMoney(rate * quantity);
                const discountAmount = toMoney(item.discountAmount);

                return {
                    id: item.id,
                    name: cleanInlineText(item.productNameSnapshot, 'Item'),
                    quantity,
                    rate: formatMoney(rate),
                    grossAmount: formatMoney(grossAmount),
                    discount: discountAmount > 0 ? formatMoney(-discountAmount) : null,
                };
            });

            const unitCount = items.reduce((sum, item) => sum + item.quantity, 0);
            const footerText =
                cleanReceiptText(data.settings.receiptFooter) || 'Thank you for your visit!';

            return {
                shopName: getReceiptShopName(data.settings.shopName),
                address: cleanReceiptText(data.settings.address),
                phone: cleanInlineText(data.settings.phone, ''),
                headerText: cleanReceiptText(data.settings.receiptHeader),
                footerText,
                invoiceNumber: cleanInlineText(data.sale.invoiceNumber),
                date: formatDateTime(data.sale.createdAt, 'dd/MM/yyyy'),
                time: formatDateTime(data.sale.createdAt, 'hh:mm a'),
                cashier: cleanInlineText(data.sale.cashier.fullName),
                paymentMethod: formatLabel(data.sale.paymentMethod),
                note: cleanReceiptText(data.sale.note),
                items,
                unitCount,
                summaryRows,
                total: formatMoney(total),
                paid: formatMoney(data.sale.paidAmount),
                change: formatMoney(data.sale.balance),
            };
        }, [data, moneyFormatter]);

        if (!receipt) {
            return null;
        }

        return (
            <div
                ref={ref}
                className="printable-receipt w-[2.8in] bg-white px-[10px] py-3 font-mono text-[11px] leading-[1.32] tracking-normal text-black shadow-sm"
            >
                <style>{RECEIPT_PAGE_STYLE}</style>

                <div className="space-y-1 text-center">
                    {receipt.shopName ? (
                        <p className="text-[15px] font-extrabold leading-tight uppercase">
                            {receipt.shopName}
                        </p>
                    ) : (
                        <p className="text-[15px] font-extrabold leading-tight uppercase">
                            BLISSORA
                        </p>
                    )}

                    <p className="text-[11px] font-bold [overflow-wrap:anywhere]">
                        Bill #: {receipt.invoiceNumber}
                    </p>
                    {receipt.address ? (
                        <p className="whitespace-pre-line leading-snug">{receipt.address}</p>
                    ) : null}
                    {receipt.phone ? <p>Tel: {receipt.phone}</p> : null}
                    {receipt.headerText ? (
                        <p className="whitespace-pre-line pt-1 leading-snug">
                            {receipt.headerText}
                        </p>
                    ) : null}
                </div>

                <div className="my-3 border-y border-black py-1 text-center text-[12px] font-bold uppercase">
                    Original Receipt
                </div>

                <div className="space-y-1">
                    <div className="grid grid-cols-2 gap-x-3">
                        <p>Date: {receipt.date}</p>
                        <p className="text-right">Time: {receipt.time}</p>
                    </div>
                    <p>Cashier: {receipt.cashier}</p>
                    <p>Items: {receipt.unitCount}</p>
                </div>

                <table className="mt-3 w-full table-fixed border-collapse text-left">
                    <thead>
                        <tr className="border-y border-black text-[10px] uppercase">
                            <th className="w-[39%] py-1 pr-1 font-bold">Item</th>
                            <th className="w-[9%] py-1 text-right font-bold">Qty</th>
                            <th className="w-[24%] py-1 text-right font-bold">Rate</th>
                            <th className="w-[28%] py-1 text-right font-bold">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {receipt.items.map((item) => (
                            <Fragment key={item.id}>
                                <tr className="align-top">
                                    <td className="py-1 pr-1 leading-snug [overflow-wrap:anywhere]">
                                        {item.name}
                                    </td>
                                    <td className="py-1 text-right text-[10px] tabular-nums">
                                        {item.quantity}
                                    </td>
                                    <td className="py-1 text-right text-[10px] tabular-nums">
                                        {item.rate}
                                    </td>
                                    <td className="py-1 text-right text-[10px] tabular-nums">
                                        {item.grossAmount}
                                    </td>
                                </tr>
                                {item.discount ? (
                                    <tr>
                                        <td className="pb-1 pl-2 text-[10px]" colSpan={3}>
                                            Discount
                                        </td>
                                        <td className="pb-1 text-right text-[10px] tabular-nums">
                                            {item.discount}
                                        </td>
                                    </tr>
                                ) : null}
                            </Fragment>
                        ))}
                    </tbody>
                </table>

                <div className="mt-3 border-t border-black pt-2">
                    <div className="space-y-1">
                        {receipt.summaryRows.map((row) => (
                            <div key={row.label} className="flex items-start justify-between gap-3">
                                <span>{row.label}</span>
                                <span className="text-right tabular-nums">{row.value}</span>
                            </div>
                        ))}
                    </div>

                    <div className="my-2 flex items-center justify-between gap-3 border-y border-dashed border-black py-1.5 text-[13px] font-extrabold uppercase">
                        <span>Total</span>
                        <span className="text-right tabular-nums">{receipt.total}</span>
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-start justify-between gap-3">
                            <span>Paid By</span>
                            <span className="text-right font-bold">{receipt.paymentMethod}</span>
                        </div>
                        <div className="flex items-start justify-between gap-3">
                            <span>Paid</span>
                            <span className="text-right tabular-nums">{receipt.paid}</span>
                        </div>
                        <div className="flex items-start justify-between gap-3">
                            <span>Change</span>
                            <span className="text-right tabular-nums">{receipt.change}</span>
                        </div>
                    </div>
                </div>

                {receipt.note ? (
                    <div className="mt-3 border-t border-dashed border-black pt-2 text-left leading-snug">
                        <p className="whitespace-pre-line">Note: {receipt.note}</p>
                    </div>
                ) : null}

                <div className="mt-3 border-t border-black pt-3 text-center">
                    <p className="whitespace-pre-line leading-snug">{receipt.footerText}</p>
                </div>

                <div className="mt-3 border-t border-black pt-3 text-center">
                    <p className="text-[9px] font-bold uppercase tracking-normal">
                        Scan Barcode For Returns
                    </p>
                    <div className="mt-1 bg-white px-1 py-1">
                        <svg
                            ref={barcodeRef}
                            aria-label={`Return barcode for bill ${receipt.invoiceNumber}`}
                            className="mx-auto block h-[62px] w-full"
                            role="img"
                        />
                    </div>
                </div>
            </div>
        );
    }),
);

PrintableReceipt.displayName = 'PrintableReceipt';
