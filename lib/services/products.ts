import 'server-only';

import { Prisma } from '@prisma/client';

import { PAGE_SIZE } from '@/lib/constants';
import { prisma } from '@/lib/db/prisma';
import type { ProductFormCategory, ProductFormProduct } from '@/lib/types';
import { generateBarcode, generateInternalCode, toMoney } from '@/lib/utils';
import { productSchema, type ProductInput } from '@/lib/validations/product';

const posProductSelect = {
    id: true,
    name: true,
    barcode: true,
    stockQuantity: true,
    sellingPrice: true,
    category: {
        select: {
            name: true,
        },
    },
} satisfies Prisma.ProductSelect;

type ListProductsOptions = {
    query?: string;
    categoryId?: string;
    page?: number;
};

export async function listProducts(options: ListProductsOptions = {}) {
    const page = Math.max(options.page ?? 1, 1);
    const query = options.query?.trim();

    const where: Prisma.ProductWhereInput = {
        ...(query
            ? {
                  OR: [
                      { name: { contains: query, mode: 'insensitive' } },
                      { barcode: { contains: query, mode: 'insensitive' } },
                  ],
              }
            : {}),
        ...(options.categoryId ? { categoryId: options.categoryId } : {}),
    };

    const [items, totalCount, categories] = await Promise.all([
        prisma.product.findMany({
            where,
            include: { category: true },
            orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
            skip: (page - 1) * PAGE_SIZE,
            take: PAGE_SIZE,
        }),
        prisma.product.count({ where }),
        prisma.category.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
        }),
    ]);

    return {
        items: items.map<ProductFormProduct & { category: { name: string } | null }>((item) => ({
            id: item.id,
            name: item.name,
            barcode: item.barcode,
            categoryId: item.categoryId,
            buyingPrice: Number(item.buyingPrice),
            sellingPrice: Number(item.sellingPrice),
            stockQuantity: item.stockQuantity,
            lowStockLimit: item.lowStockLimit,
            isActive: item.isActive,
            category: item.category ? { name: item.category.name } : null,
        })),
        categories: categories.map<ProductFormCategory>((category) => ({
            id: category.id,
            name: category.name,
        })),
        page,
        totalCount,
        totalPages: Math.max(Math.ceil(totalCount / PAGE_SIZE), 1),
    };
}

export async function getProductOptions(query?: string, limit = 12) {
    const where: Prisma.ProductWhereInput = {
        isActive: true,
        stockQuantity: {
            gt: 0,
        },
        ...(query
            ? {
                  OR: [
                      { name: { contains: query, mode: 'insensitive' } },
                      { barcode: { contains: query, mode: 'insensitive' } },
                  ],
              }
            : {}),
    };

    const items = await prisma.product.findMany({
        where,
        select: posProductSelect,
        orderBy: { name: 'asc' },
        take: limit,
    });

    return items.map((item) => ({
        ...item,
        sellingPrice: Number(item.sellingPrice),
    }));
}

export async function getProductByBarcode(barcode: string) {
    const item = await prisma.product.findUnique({
        where: { barcode },
        select: posProductSelect,
    });

    if (!item) {
        return null;
    }

    return {
        ...item,
        sellingPrice: Number(item.sellingPrice),
    };
}

export async function getCategoryOptions() {
    return prisma.category.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
    });
}

export async function saveProduct(input: ProductInput) {
    const values = productSchema.parse(input);
    const normalizedBarcode = (values.barcode ?? '').trim();

    const existingByBarcode = normalizedBarcode
        ? await prisma.product.findFirst({
              where: {
                  barcode: normalizedBarcode,
                  NOT: values.id ? { id: values.id } : undefined,
              },
          })
        : null;

    if (existingByBarcode) {
        throw new Error('Barcode already exists');
    }

    const productCount = await prisma.product.count();

    const data = {
        name: values.name.trim(),
        barcode: normalizedBarcode || generateBarcode(productCount + 1),
        categoryId: values.categoryId || null,
        buyingPrice: new Prisma.Decimal(toMoney(values.buyingPrice)),
        sellingPrice: new Prisma.Decimal(toMoney(values.sellingPrice)),
        stockQuantity: values.stockQuantity,
        lowStockLimit: values.lowStockLimit,
        isActive: values.isActive,
        internalCode: values.id ? undefined : generateInternalCode(productCount + 1),
    };

    if (values.id) {
        return prisma.product.update({
            where: { id: values.id },
            data,
        });
    }

    return prisma.product.create({ data });
}

export async function deleteProduct(productId: string) {
    const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
            saleItems: { select: { id: true }, take: 1 },
            returnItems: { select: { id: true }, take: 1 },
            stockMovement: { select: { id: true }, take: 1 },
        },
    });

    if (!product) {
        throw new Error('Product not found');
    }

    const hasHistory =
        product.saleItems.length > 0 ||
        product.returnItems.length > 0 ||
        product.stockMovement.length > 0;

    if (hasHistory) {
        return prisma.product.update({
            where: { id: productId },
            data: { isActive: false },
        });
    }

    return prisma.product.delete({ where: { id: productId } });
}
