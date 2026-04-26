import 'server-only';

import { PaymentMethod, Prisma } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import { generateInvoiceNumber, toMoney } from '@/lib/utils';
import { saleSchema, type SaleInput } from '@/lib/validations/sale';

type ListSalesOptions = {
    query?: string;
    page?: number;
};

export async function listSales(options: ListSalesOptions = {}) {
    const page = Math.max(options.page ?? 1, 1);
    const take = 12;

    const where: Prisma.SaleWhereInput = options.query
        ? {
              invoiceNumber: {
                  contains: options.query,
                  mode: 'insensitive',
              },
          }
        : {};

    const [items, totalCount] = await Promise.all([
        prisma.sale.findMany({
            where,
            include: {
                cashier: true,
                items: true,
                payment: true,
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * take,
            take,
        }),
        prisma.sale.count({ where }),
    ]);

    return {
        items,
        page,
        totalCount,
        totalPages: Math.max(Math.ceil(totalCount / take), 1),
    };
}

export async function listRecentSalesForPos(limit = 6) {
    return prisma.sale.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
            id: true,
            invoiceNumber: true,
            cashier: {
                select: {
                    fullName: true,
                },
            },
        },
    });
}

export async function getSaleById(saleId: string) {
    return prisma.sale.findUnique({
        where: { id: saleId },
        include: {
            cashier: true,
            items: true,
            payment: true,
            returns: {
                include: {
                    items: true,
                },
            },
        },
    });
}

export async function getSaleByInvoiceNumber(invoiceNumber: string) {
    return prisma.sale.findUnique({
        where: { invoiceNumber },
        include: {
            cashier: true,
            items: {
                include: {
                    returnItems: true,
                    product: true,
                },
            },
            payment: true,
            returns: {
                include: {
                    items: true,
                },
            },
        },
    });
}

export async function completeSale(input: SaleInput, cashierId: string) {
    const values = saleSchema.parse(input);

    const uniqueProductIds = Array.from(new Set(values.items.map((item) => item.productId)));
    const products = await prisma.product.findMany({
        where: {
            id: { in: uniqueProductIds },
            isActive: true,
        },
    });

    if (products.length !== uniqueProductIds.length) {
        throw new Error('One or more products are unavailable');
    }

    const productMap = new Map(products.map((product) => [product.id, product]));
    const draftLines = values.items.map((item) => {
        const product = productMap.get(item.productId);

        if (!product) {
            throw new Error('Product not found');
        }

        if (item.quantity > product.stockQuantity) {
            throw new Error(`${product.name} does not have enough stock`);
        }

        const lineSubtotal = toMoney(Number(product.sellingPrice) * item.quantity);
        const itemDiscount = Math.min(toMoney(item.discountAmount), lineSubtotal);
        const lineAfterItemDiscount = toMoney(lineSubtotal - itemDiscount);

        return {
            item,
            product,
            lineSubtotal,
            itemDiscount,
            lineAfterItemDiscount,
        };
    });

    const subtotal = toMoney(draftLines.reduce((sum, line) => sum + line.lineSubtotal, 0));
    const itemDiscountTotal = toMoney(draftLines.reduce((sum, line) => sum + line.itemDiscount, 0));
    const netBeforeCartDiscount = toMoney(subtotal - itemDiscountTotal);
    const cartDiscount = Math.min(toMoney(values.cartDiscount), netBeforeCartDiscount);

    let remainingCartDiscount = cartDiscount;

    const finalizedLines = draftLines.map((line, index) => {
        const cartDiscountShare =
            index === draftLines.length - 1
                ? remainingCartDiscount
                : toMoney(
                      (line.lineAfterItemDiscount / Math.max(netBeforeCartDiscount, 1)) *
                          cartDiscount,
                  );

        remainingCartDiscount = toMoney(remainingCartDiscount - cartDiscountShare);

        const totalDiscount = toMoney(line.itemDiscount + cartDiscountShare);
        const lineTotal = toMoney(line.lineSubtotal - totalDiscount);

        return {
            ...line,
            cartDiscountShare,
            totalDiscount,
            lineTotal,
        };
    });

    const total = toMoney(finalizedLines.reduce((sum, line) => sum + line.lineTotal, 0));
    const paidAmount = toMoney(values.paidAmount);
    const balance = toMoney(paidAmount - total);

    if (paidAmount < total) {
        throw new Error('Paid amount cannot be less than the order total');
    }

    return prisma.$transaction(async (tx) => {
        const sale = await tx.sale.create({
            data: {
                invoiceNumber: generateInvoiceNumber(),
                cashierId,
                subtotal: new Prisma.Decimal(subtotal.toFixed(2)),
                itemDiscount: new Prisma.Decimal(itemDiscountTotal.toFixed(2)),
                cartDiscount: new Prisma.Decimal(cartDiscount.toFixed(2)),
                total: new Prisma.Decimal(total.toFixed(2)),
                paidAmount: new Prisma.Decimal(paidAmount.toFixed(2)),
                balance: new Prisma.Decimal(balance.toFixed(2)),
                paymentMethod: values.paymentMethod as PaymentMethod,
                note: values.note || null,
                items: {
                    create: finalizedLines.map((line) => ({
                        productId: line.product.id,
                        productNameSnapshot: line.product.name,
                        productBarcodeSnapshot: line.product.barcode,
                        buyingPriceSnapshot: line.product.buyingPrice,
                        sellingPriceSnapshot: line.product.sellingPrice,
                        quantity: line.item.quantity,
                        lineSubtotal: new Prisma.Decimal(line.lineSubtotal.toFixed(2)),
                        discountAmount: new Prisma.Decimal(line.totalDiscount.toFixed(2)),
                        lineTotal: new Prisma.Decimal(line.lineTotal.toFixed(2)),
                    })),
                },
            },
            include: {
                cashier: true,
                items: true,
            },
        });

        await tx.payment.create({
            data: {
                saleId: sale.id,
                method: values.paymentMethod,
                amount: new Prisma.Decimal(paidAmount.toFixed(2)),
            },
        });

        for (const line of finalizedLines) {
            const nextStock = line.product.stockQuantity - line.item.quantity;

            await tx.product.update({
                where: { id: line.product.id },
                data: { stockQuantity: nextStock },
            });

            await tx.stockMovement.create({
                data: {
                    productId: line.product.id,
                    type: 'SALE',
                    quantityChange: -line.item.quantity,
                    stockBefore: line.product.stockQuantity,
                    stockAfter: nextStock,
                    referenceId: sale.id,
                    referenceType: 'SALE',
                    note: `Sold on ${sale.invoiceNumber}`,
                    createdById: cashierId,
                },
            });
        }

        return sale;
    });
}
