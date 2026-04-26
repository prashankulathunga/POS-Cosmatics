import "server-only";

import { Prisma, StockMovementType } from "@prisma/client";

import { PAGE_SIZE } from "@/lib/constants";
import { prisma } from "@/lib/db/prisma";
import type { InventoryAdjustProduct } from "@/lib/types";

type ListInventoryOptions = {
  page?: number;
  query?: string;
};

export async function listInventory(options: ListInventoryOptions = {}) {
  const page = Math.max(options.page ?? 1, 1);

  const where: Prisma.ProductWhereInput = options.query
    ? {
        OR: [
          { name: { contains: options.query, mode: "insensitive" } },
          { barcode: { contains: options.query, mode: "insensitive" } },
        ],
      }
    : {};

  const [products, totalCount, lowStockRows, movements] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { stockQuantity: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where }),
    prisma.$queryRaw<Array<{ count: bigint }>>(
      Prisma.sql`SELECT COUNT(*)::bigint AS "count" FROM "Product" WHERE "isActive" = true AND "stockQuantity" <= "lowStockLimit"`,
    ),
    prisma.stockMovement.findMany({
      include: {
        product: true,
        createdBy: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return {
    products: products.map<InventoryAdjustProduct>((product) => ({
      id: product.id,
      name: product.name,
      barcode: product.barcode,
      stockQuantity: product.stockQuantity,
      lowStockLimit: product.lowStockLimit,
      category: product.category ? { name: product.category.name } : null,
    })),
    movements,
    lowStockCount: Number(lowStockRows[0]?.count ?? 0),
    page,
    totalCount,
    totalPages: Math.max(Math.ceil(totalCount / PAGE_SIZE), 1),
  };
}

export async function createStockAdjustment(input: {
  productId: string;
  quantityChange: number;
  note: string;
  createdById: string;
}) {
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
  });

  if (!product) {
    throw new Error("Product not found");
  }

  if (input.quantityChange === 0) {
    throw new Error("Adjustment quantity cannot be zero");
  }

  const nextStock = product.stockQuantity + input.quantityChange;

  if (nextStock < 0) {
    throw new Error("Adjustment cannot reduce stock below zero");
  }

  const type =
    input.quantityChange > 0 ? StockMovementType.ADJUSTMENT_IN : StockMovementType.ADJUSTMENT_OUT;

  return prisma.$transaction(async (tx) => {
    const updatedProduct = await tx.product.update({
      where: { id: product.id },
      data: { stockQuantity: nextStock },
    });

    await tx.stockMovement.create({
      data: {
        productId: product.id,
        type,
        quantityChange: input.quantityChange,
        stockBefore: product.stockQuantity,
        stockAfter: nextStock,
        note: input.note,
        createdById: input.createdById,
      },
    });

    return updatedProduct;
  });
}
