'use client';

import type { Settings } from '@prisma/client';
import { Search, ShoppingCart, Trash2 } from 'lucide-react';
import {
    startTransition,
    useDeferredValue,
    useEffect,
    useEffectEvent,
    useRef,
    useState,
} from 'react';
import { toast } from 'sonner';

import { completeSaleAction } from '@/lib/actions/sales-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { printReceiptEscPos, type ReceiptPayload } from '@/lib/print-escpos';
import type { PosProductSummary, PosRecentSaleSummary } from '@/lib/types';
import { formatCurrency, toMoney } from '@/lib/utils';
import { Label } from '@radix-ui/react-label';
import { Textarea } from '@/components/ui/textarea';

type CartItem = {
    product: PosProductSummary;
    quantity: number;
    discountAmount: number;
};

function getErrorMessage(error: unknown) {
    if (error instanceof Error) {
        return error.message;
    }

    if (typeof error === 'string') {
        return error;
    }

    if (error == null) {
        return 'Unknown print error';
    }

    try {
        return JSON.stringify(error);
    } catch {
        return String(error);
    }
}

export function PosTerminal({
    initialProducts,
    recentSales,
    settings,
}: {
    initialProducts: PosProductSummary[];
    recentSales: PosRecentSaleSummary[];
    settings: Settings;
}) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [productSearch, setProductSearch] = useState('');
    const [scannerInput, setScannerInput] = useState('');
    const [productResults, setProductResults] = useState(initialProducts);
    const [isSearching, setIsSearching] = useState(false);
    const [cartDiscount, setCartDiscount] = useState('0');
    const [paidAmount, setPaidAmount] = useState('0');
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD'>('CASH');
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const deferredSearch = useDeferredValue(productSearch);
    const latestSearchId = useRef(0);

    const [isPrint, setIsPrint] = useState(false);
    const isPrintRef = useRef(false);

    const fetchProducts = useEffectEvent(async (query: string, requestId: number) => {
        const response = await fetch(
            `/api/products/search?query=${encodeURIComponent(query)}&limit=24`,
            {
                cache: 'no-store',
            },
        );

        if (!response.ok) {
            if (requestId === latestSearchId.current) {
                setIsSearching(false);
            }
            return;
        }

        const payload = (await response.json()) as { items: PosProductSummary[] };

        if (requestId !== latestSearchId.current) {
            return;
        }

        setProductResults(payload.items);
        setIsSearching(false);
    });

    useEffect(() => {
        const query = deferredSearch.trim();

        if (!query) {
            return;
        }

        const requestId = latestSearchId.current + 1;
        latestSearchId.current = requestId;

        const timer = window.setTimeout(() => {
            startTransition(async () => {
                await fetchProducts(query, requestId);
            });
        }, 160);

        return () => window.clearTimeout(timer);
    }, [deferredSearch, initialProducts]);

    const subtotal = cart.reduce(
        (sum, item) => sum + Number(item.product.sellingPrice) * item.quantity,
        0,
    );
    const itemDiscountTotal = cart.reduce((sum, item) => sum + item.discountAmount, 0);
    const total = Math.max(0, toMoney(subtotal - itemDiscountTotal - Number(cartDiscount || 0)));
    const change = toMoney(Number(paidAmount || 0) - total);

    function addProduct(product: PosProductSummary) {
        setCart((current) => {
            const existing = current.find((entry) => entry.product.id === product.id);

            if (existing) {
                if (existing.quantity >= product.stockQuantity) {
                    toast.error('No more stock available for this item');
                    return current;
                }

                return current.map((entry) =>
                    entry.product.id === product.id
                        ? { ...entry, quantity: entry.quantity + 1 }
                        : entry,
                );
            }

            return [...current, { product, quantity: 1, discountAmount: 0 }];
        });
    }

    function updateQuantity(productId: string, delta: number) {
        setCart((current) =>
            current
                .map((entry) => {
                    if (entry.product.id !== productId) {
                        return entry;
                    }

                    const nextQuantity = entry.quantity + delta;
                    if (nextQuantity > entry.product.stockQuantity) {
                        toast.error('Sale quantity cannot exceed available stock');
                        return entry;
                    }

                    return { ...entry, quantity: nextQuantity };
                })
                .filter((entry) => entry.quantity > 0),
        );
    }

    async function loadReceipt(saleId: string) {

        // TODO: resolve this fetch query
        const response = await fetch(`/api/receipt/${saleId}`);


        if (!response.ok) {
            toast.error('Unable to load receipt');
            return null;
        }

        // NOTE:Only get data from sales table only
        return (await response.json()) as ReceiptPayload;
    }

    async function handleReceiptPrint(saleId: string) {
        if (isPrintRef.current) return;

        try {
            isPrintRef.current = true;
            setIsPrint(true);

            const receiptData = await loadReceipt(saleId);
            if (!receiptData) {
                return;
            }

            await printReceiptEscPos(receiptData);

        } catch (error) {
            console.error('Receipt print failed', error);
            const errorMessage = getErrorMessage(error);

            toast.error('Receipt print failed', {
                description: errorMessage,
                duration: 12000,
                action: {
                    label: 'Retry Print',
                    onClick: () => {
                        void handleReceiptPrint(saleId);
                    },
                },
                cancel: {
                    label: 'Browser Print',
                    onClick: () => window.print(),
                },
            });
        } finally {
            isPrintRef.current = false;
            setIsPrint(false);
        }
    }

    async function handleScan() {
        const barcode = scannerInput.trim();
        if (!barcode) {
            return;
        }

        const response = await fetch(
            `/api/products/search?barcode=${encodeURIComponent(barcode)}`,
            {
                cache: 'no-store',
            },
        );

        if (!response.ok) {
            toast.error('Unable to check barcode');
            return;
        }

        const payload = (await response.json()) as { items: PosProductSummary[] };
        const product = payload.items[0];

        if (!product) {
            toast.error('No product matches that barcode');
            return;
        }

        addProduct(product);
        setScannerInput('');
    }

    async function handleCheckout() {
        if (cart.length === 0) {
            toast.error('Add items before checkout');
            return;
        }

        setIsSubmitting(true);

        const result = await completeSaleAction({
            items: cart.map((item) => ({
                productId: item.product.id,
                quantity: item.quantity,
                discountAmount: item.discountAmount,
            })),
            cartDiscount: Number(cartDiscount || 0),
            paidAmount: Number(paidAmount || 0),
            paymentMethod,
            note,
        });

        setIsSubmitting(false);

        if (!result.success || !result.data) {
            toast.error(result.error);
            return;
        }

        toast.success('Sale completed');
        setCart([]);
        setCartDiscount('0');
        setPaidAmount('0');
        setNote('');
        void handleReceiptPrint(result.data.saleId);
    }

    return (
        <div className="grid gap-2 xl:grid-cols-[minmax(0,1.25fr)_420px]">
            <Card className="px-6 bg-[linear-gradient(245deg,#ffffff,#f8b8bb15)]">
                <CardHeader>
                    <CardTitle>Stock Product Browser</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2">
                        <div className="relative">
                            <Search className="absolute w-4 h-4 -translate-y-1/2 pointer-events-none left-3 top-1/2 text-slate-400" />
                            <Input
                                placeholder="Search by name or barcode"
                                value={productSearch}
                                onChange={(event) => {
                                    const value = event.target.value;
                                    setProductSearch(value);

                                    if (!value.trim()) {
                                        latestSearchId.current += 1;
                                        setIsSearching(false);
                                        setProductResults(initialProducts);
                                    } else {
                                        setIsSearching(true);
                                    }
                                }}
                                className="pl-9"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Scan barcode and press Enter"
                                value={scannerInput}
                                autoFocus
                                onChange={(event) => setScannerInput(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        event.preventDefault();
                                        startTransition(async () => {
                                            await handleScan();
                                        });
                                    }
                                }}
                            />
                            <Button
                                variant="secondary"
                                onClick={() => startTransition(async () => handleScan())}
                            >
                                Scan
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mt-8">
                        {(deferredSearch.trim() ? productResults : initialProducts).map(
                            (product) => (
                                <button
                                    key={product.id}
                                    type="button"
                                    onClick={() => addProduct(product)}
                                    className="py-8 px-10 text-left transition hover:bg-white border rounded-2xl border-none hover:border-[#f8b8bb] bg-[#f8b8bb25] shadow-md"
                                >
                                    <p className="mt-1 text-xs text-slate-400">
                                        BN: {product.barcode}
                                    </p>
                                    <h1 className="font-bold text-slate-600 text-base mt-1">
                                        {product.name}
                                    </h1>
                                    <hr className="mt-2" />
                                    <div className="flex items-center justify-between gap-2 mt-4">
                                        <span className="font-bold text-gray-800 text-lg">
                                            {formatCurrency(
                                                Number(product.sellingPrice),
                                                settings.currencyCode,
                                            )}
                                        </span>
                                        <span className="text-base text-gray-600 font-medium">
                                            Stock {product.stockQuantity}
                                        </span>
                                    </div>
                                </button>
                            ),
                        )}
                        {(deferredSearch.trim() ? productResults : initialProducts).length === 0 ? (
                            <div className="p-6 text-sm border border-dashed rounded-2xl border-slate-200 bg-slate-50 text-slate-500 sm:col-span-2 xl:col-span-3">
                                {isSearching
                                    ? 'Searching products...'
                                    : 'No products match this search.'}
                            </div>
                        ) : null}
                    </div>
                </CardContent>
            </Card>

            {/* Cart start section */}

            <Card className="px-2">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5" />
                        Cart
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 space-y-3 rounded-2xl bg-[linear-gradient(135deg,#ffffff,#f8b8bb40)] shadow-xl">
                        <div className="flex justify-between text-md">
                            <span className="font-medium">
                                Subtotal{' '}
                                <span className="text-red-500 ml-4 text-sm">Without discount*</span>
                            </span>
                            <span className="font-bold text-md">
                                {formatCurrency(subtotal, settings.currencyCode)}
                            </span>
                        </div>
                        <hr className="mt-4" />
                        <div className="flex items-center justify-between gap-4 mt-6">
                            <span className="text-sm w-2/3">Cart Discount</span>
                            <Input
                                className="w-24"
                                type="number"
                                step="0.01"
                                value={cartDiscount}
                                onChange={(event) => setCartDiscount(event.target.value)}
                            />
                        </div>
                        <hr className="mt-8" />
                        <div className="flex justify-between text-base font-semibold mt-6">
                            <span className="text-2xl">Total Amount</span>
                            <span className="text-2xl font-bold">
                                {formatCurrency(total, settings.currencyCode)}
                            </span>
                        </div>
                        <div className="flex gap-4 my-12">
                            <Button
                                variant={paymentMethod === 'CASH' ? 'default' : 'secondary'}
                                className="flex-1"
                                onClick={() => setPaymentMethod('CASH')}
                            >
                                Cash
                            </Button>
                            <Button
                                variant={paymentMethod === 'CARD' ? 'default' : 'secondary'}
                                className="flex-1"
                                onClick={() => setPaymentMethod('CARD')}
                            >
                                Card
                            </Button>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                            <Label htmlFor="paidAmount" className="w-48 font-medium">
                                {' '}
                                <span className="text-red-400">*</span> Paid Amount :{' '}
                            </Label>
                            <Input
                                id="paidAmount"
                                placeholder="Paid amount"
                                type="number"
                                step="0.01"
                                value={paidAmount}
                                onChange={(event) => setPaidAmount(event.target.value)}
                            />
                        </div>

                        <Textarea
                            placeholder="Optional note"
                            value={note}
                            onChange={(event) => setNote(event.target.value)}
                        />

                        <hr className="mt-4" />

                        <div className="flex justify-between item-center text-xl my-8 font-bold">
                            <span>
                                {' '}
                                <span className="text-red-500">*</span>Change
                            </span>
                            <span className="text-red-500">
                                {formatCurrency(change, settings.currencyCode)}
                            </span>
                        </div>
                        <Button
                            className="w-full my-4"
                            onClick={() => startTransition(async () => handleCheckout())}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Saving sale...' : 'Complete sale'}
                        </Button>
                    </div>

                    <div className="max-h-90 space-y-3 overflow-y-auto pb-12 pt-8">
                        {cart.length === 0 ? (
                            <p className="p-4 text-base text-gray-300 mt-8 text-center font-medium">
                                *Scan a barcode or click a product to start the sale.
                            </p>
                        ) : (
                            cart.map((item) => (
                                <div
                                    key={item.product.id}
                                    className="p-4 border rounded-2xl border-slate-200 bg-[linear-gradient(245deg,#ffffff,#f8b8bb15)]"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex flex-col-reverse py-4 justify-center items-start w-full mx-4">
                                            <p className="text-xs text-slate-500">
                                                BN: {item.product.barcode}
                                            </p>
                                            <p className="font-bold text-slate-700 text-lg">
                                                {item.product.name}
                                            </p>
                                        </div>

                                        <div className="w-1/2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => updateQuantity(item.product.id, -1)}
                                            >
                                                -
                                            </Button>
                                            <span className="text-center min-w-8 text-xl font-medium">
                                                {item.quantity}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => updateQuantity(item.product.id, 1)}
                                            >
                                                +
                                            </Button>
                                        </div>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                                updateQuantity(item.product.id, -item.quantity)
                                            }
                                        >
                                            <Trash2 className="w-4 h-4 text-red-400" />
                                        </Button>
                                    </div>

                                    {/* Discount price give one by one product */}

                                    {/* <div className="flex items-center gap-4 mt-4 w-full justify-between">

                                        <div>
                                            <Input
                                                id="discount"
                                                type="number"
                                                step="0.01"
                                                className="ml-auto"
                                                value={item.discountAmount}
                                                onChange={(event) =>
                                                    updateDiscount(
                                                        item.product.id,
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                            <hr className="mt-4" />
                                            <Label
                                                htmlFor="discount"
                                                className="text-xs text-slate-400"
                                            >
                                                Discounted Price
                                            </Label>
                                        </div>
                                    </div> */}
                                </div>
                            ))
                        )}
                    </div>

                    <hr className="mt-8" />

                    <p className="text-lg px-4 font-medium text-slate-700 mt-8">
                        Recent sales recept
                    </p>
                    <div className="space-y-4 mt-6 max-h-96 overflow-scroll">
                        {recentSales.slice(0, 6).map((sale) => (
                            <div
                                key={sale.id}
                                className="flex items-center justify-between p-4 border rounded-2xl border-slate-100 bg-[#f4f4f4]/50"
                            >
                                <div>
                                    <p className="font-medium text-slate-900">
                                        {sale.invoiceNumber}
                                    </p>
                                    <p className="text-sm text-slate-500">
                                        {sale.cashier.fullName}
                                    </p>
                                </div>
                                <Button
                                    disabled={isPrint}
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        startTransition(async () => handleReceiptPrint(sale.id))
                                    }
                                >
                                    {isPrint ? 'Printing' : 'Reprint'}
                                </Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
