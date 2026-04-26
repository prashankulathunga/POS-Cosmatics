import 'server-only';

import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import { generateReturnNumber, toMoney } from '@/lib/utils';
import { returnSchema, type ReturnInput } from '@/lib/validations/return';

export async function lookupReturnableSale(invoiceNumber: string) {
    const sale = await prisma.sale.findUnique({
        where: { invoiceNumber },
        include: {
            cashier: true,
            items: {
                include: {
                    product: true,
                    returnItems: true,
                },
            },
            returns: {
                include: {
                    items: true,
                },
            },
        },
    });

    if (!sale) {
        return null;
    }

    const items = sale.items.map((item) => {
        const returnedQty = item.returnItems.reduce(
            (sum, returnItem) => sum + returnItem.quantity,
            0,
        );
        const remainingQty = item.quantity - returnedQty;
        const refundableUnitPrice = toMoney(Number(item.lineTotal) / item.quantity);

        return {
            ...item,
            returnedQty,
            remainingQty,
            refundableUnitPrice,
        };
    });

    return {
        ...sale,
        items,
    };
}

export async function processReturn(input: ReturnInput, cashierId: string) {
    const values = returnSchema.parse(input);
    const sale = await lookupReturnableSaleById(values.saleId);

    if (!sale) {
        throw new Error('Sale not found');
    }

    const saleItemsMap = new Map(sale.items.map((item) => [item.id, item]));

    const returnLines = values.items.map((item) => {
        const saleItem = saleItemsMap.get(item.saleItemId);

        if (!saleItem) {
            throw new Error('Returned item not found in sale');
        }

        if (item.quantity > saleItem.remainingQty) {
            throw new Error(
                `Return quantity exceeds remaining quantity for ${saleItem.productNameSnapshot}`,
            );
        }

        return {
            saleItem,
            quantity: item.quantity,
            unitRefundAmount: saleItem.refundableUnitPrice,
            lineTotal: toMoney(item.quantity * saleItem.refundableUnitPrice),
        };
    });

    const refundAmount = toMoney(returnLines.reduce((sum, line) => sum + line.lineTotal, 0));

    return prisma.$transaction(async (tx) => {
        const returnRecord = await tx.return.create({
            data: {
                returnNumber: generateReturnNumber(),
                saleId: sale.id,
                cashierId,
                reason: values.reason || null,
                refundAmount: new Prisma.Decimal(refundAmount.toFixed(2)),
                items: {
                    create: returnLines.map((line) => ({
                        saleItemId: line.saleItem.id,
                        productId: line.saleItem.productId,
                        quantity: line.quantity,
                        unitPriceSnapshot: new Prisma.Decimal(line.unitRefundAmount.toFixed(2)),
                        buyingPriceSnapshot: line.saleItem.buyingPriceSnapshot,
                        lineTotal: new Prisma.Decimal(line.lineTotal.toFixed(2)),
                        productNameSnapshot: line.saleItem.productNameSnapshot,
                        productBarcodeSnapshot: line.saleItem.productBarcodeSnapshot,
                    })),
                },
            },
            include: {
                items: true,
            },
        });

        for (const line of returnLines) {
            if (!line.saleItem.productId) {
                continue;
            }

            const product = await tx.product.findUnique({
                where: { id: line.saleItem.productId },
            });

            if (!product) {
                continue;
            }

            const nextStock = product.stockQuantity + line.quantity;

            await tx.product.update({
                where: { id: product.id },
                data: { stockQuantity: nextStock },
            });

            await tx.stockMovement.create({
                data: {
                    productId: product.id,
                    type: 'RETURN',
                    quantityChange: line.quantity,
                    stockBefore: product.stockQuantity,
                    stockAfter: nextStock,
                    referenceId: returnRecord.id,
                    referenceType: 'RETURN',
                    note: `Returned from invoice ${sale.invoiceNumber}`,
                    createdById: cashierId,
                },
            });
        }

        return returnRecord;
    });
}

async function lookupReturnableSaleById(saleId: string) {
    const sale = await prisma.sale.findUnique({
        where: { id: saleId },
        include: {
            items: {
                include: {
                    returnItems: true,
                },
            },
        },
    });

    if (!sale) {
        return null;
    }

    return {
        ...sale,
        items: sale.items.map((item) => {
            const returnedQty = item.returnItems.reduce((sum, row) => sum + row.quantity, 0);
            return {
                ...item,
                returnedQty,
                remainingQty: item.quantity - returnedQty,
                refundableUnitPrice: toMoney(Number(item.lineTotal) / item.quantity),
            };
        }),
    };
}

export async function listReturns(query?: string) {
    return prisma.return.findMany({
        where: query
            ? {
                  OR: [
                      { returnNumber: { contains: query, mode: 'insensitive' } },
                      {
                          sale: {
                              invoiceNumber: { contains: query, mode: 'insensitive' },
                          },
                      },
                  ],
              }
            : undefined,
        include: {
            cashier: true,
            sale: true,
            items: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
    });
}
