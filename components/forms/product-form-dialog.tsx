'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useTransition } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { saveProductAction } from '@/lib/actions/product-actions';
import { productSchema } from '@/lib/validations/product';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { ProductFormCategory, ProductFormProduct } from '@/lib/types';

export function ProductFormDialog({
    categories,
    product,
    trigger,
}: {
    categories: ProductFormCategory[];
    product?: ProductFormProduct;
    trigger: React.ReactElement;
}) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const form = useForm<z.input<typeof productSchema>, unknown, z.output<typeof productSchema>>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            id: product?.id,
            name: product?.name ?? '',
            barcode: product?.barcode ?? '',
            categoryId: product?.categoryId ?? undefined,
            buyingPrice: product ? Number(product.buyingPrice) : 0,
            sellingPrice: product ? Number(product.sellingPrice) : 0,
            stockQuantity: product?.stockQuantity ?? 0,
            lowStockLimit: product?.lowStockLimit ?? 5,
            isActive: product?.isActive ?? true,
        },
    });

    const onSubmit = form.handleSubmit((values) => {
        startTransition(async () => {
            const result = await saveProductAction(values);

            if (!result.success) {
                toast.error(result.error);
                return;
            }

            toast.success(result.message);
            setOpen(false);
            form.reset(values);
        });
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{product ? 'Edit product' : 'Add product'}</DialogTitle>
                    <DialogDescription>
                        Save a product with barcode, pricing, and stock settings.
                    </DialogDescription>
                </DialogHeader>

                <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="name">Product name</Label>
                        <Input id="name" {...form.register('name')} />
                        {form.formState.errors.name ? (
                            <p className="text-sm text-rose-600">
                                {form.formState.errors.name.message}
                            </p>
                        ) : null}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="barcode">Barcode</Label>
                        <Input
                            id="barcode"
                            placeholder="Leave blank to auto-generate"
                            {...form.register('barcode')}
                        />
                        {form.formState.errors.barcode ? (
                            <p className="text-sm text-rose-600">
                                {form.formState.errors.barcode.message}
                            </p>
                        ) : null}
                    </div>

                    <div className="space-y-2">
                        <Label>Category</Label>
                        <Controller
                            control={form.control}
                            name="categoryId"
                            render={({ field }) => (
                                <Select
                                    value={field.value ?? 'none'}
                                    onValueChange={(value) =>
                                        field.onChange(value === 'none' ? null : value)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No category</SelectItem>
                                        {categories.map((category) => (
                                            <SelectItem key={category.id} value={category.id}>
                                                {category.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="buyingPrice">Buying price</Label>
                        <Input
                            id="buyingPrice"
                            type="number"
                            step="0.01"
                            {...form.register('buyingPrice')}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="sellingPrice">Selling price</Label>
                        <Input
                            id="sellingPrice"
                            type="number"
                            step="0.01"
                            {...form.register('sellingPrice')}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="stockQuantity">Stock quantity</Label>
                        <Input
                            id="stockQuantity"
                            type="number"
                            {...form.register('stockQuantity')}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="lowStockLimit">Low stock limit</Label>
                        <Input
                            id="lowStockLimit"
                            type="number"
                            {...form.register('lowStockLimit')}
                        />
                    </div>

                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 md:col-span-2">
                        <div>
                            <p className="font-medium text-slate-900">Active in POS</p>
                            <p className="text-sm text-slate-500">
                                Inactive products stay in history but disappear from sale search.
                            </p>
                        </div>
                        <Controller
                            control={form.control}
                            name="isActive"
                            render={({ field }) => (
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                            )}
                        />
                    </div>

                    <div className="flex justify-end gap-2 md:col-span-2">
                        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? 'Saving...' : product ? 'Save changes' : 'Create product'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
