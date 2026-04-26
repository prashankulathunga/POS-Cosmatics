import 'server-only';

import { Prisma } from '@prisma/client';
import { format, subDays } from 'date-fns';

import { prisma } from '@/lib/db/prisma';

type DailyTotalRow = {
    day: string | Date;
    total: unknown;
};

type LowStockRow = {
    id: string;
    name: string;
    barcode: string;
    stockQuantity: number;
    lowStockLimit: number;
};

export async function getDashboardData(role: 'ADMIN' | 'CASHIER', userId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const monthAgo = subDays(new Date(), 29);

    const saleWhere = role === 'CASHIER' ? { cashierId: userId } : {};
    const todaySalesWhere = {
        ...saleWhere,
        createdAt: { gte: todayStart },
    };

    const [
        todaySales,
        productsCount,
        lowStockItems,
        recentTransactions,
        recentReturns,
        expenseSummary,
        salesByDayRows,
        returnsByDayRows,
    ] = await Promise.all([
        prisma.sale.aggregate({
            where: todaySalesWhere,
            _sum: {
                total: true,
            },
            _count: true,
        }),
        prisma.product.count({ where: { isActive: true } }),
        prisma.$queryRaw<LowStockRow[]>`
            SELECT "id", "name", "barcode", "stockQuantity", "lowStockLimit"
            FROM "Product"
            WHERE "isActive" = true
              AND "stockQuantity" <= "lowStockLimit"
            ORDER BY "stockQuantity" ASC, "name" ASC
            LIMIT 5
        `,
        prisma.sale.findMany({
            where: saleWhere,
            include: {
                cashier: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 6,
        }),
        prisma.return.findMany({
            where: role === 'CASHIER' ? { cashierId: userId } : undefined,
            include: {
                sale: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 6,
        }),
        prisma.expense.aggregate({
            where: {
                expenseDate: { gte: todayStart },
            },
            _sum: {
                amount: true,
            },
        }),
        prisma.$queryRaw<DailyTotalRow[]>(
            role === 'CASHIER'
                ? Prisma.sql`
                    SELECT DATE("createdAt") AS "day", COALESCE(SUM("total"), 0) AS "total"
                    FROM "Sale"
                    WHERE "createdAt" >= ${monthAgo}
                      AND "cashierId" = ${userId}
                    GROUP BY DATE("createdAt")
                    ORDER BY DATE("createdAt") ASC
                  `
                : Prisma.sql`
                    SELECT DATE("createdAt") AS "day", COALESCE(SUM("total"), 0) AS "total"
                    FROM "Sale"
                    WHERE "createdAt" >= ${monthAgo}
                    GROUP BY DATE("createdAt")
                    ORDER BY DATE("createdAt") ASC
                  `,
        ),
        prisma.$queryRaw<DailyTotalRow[]>(
            role === 'CASHIER'
                ? Prisma.sql`
                    SELECT DATE("createdAt") AS "day", COALESCE(SUM("refundAmount"), 0) AS "total"
                    FROM "Return"
                    WHERE "createdAt" >= ${monthAgo}
                      AND "cashierId" = ${userId}
                    GROUP BY DATE("createdAt")
                    ORDER BY DATE("createdAt") ASC
                  `
                : Prisma.sql`
                    SELECT DATE("createdAt") AS "day", COALESCE(SUM("refundAmount"), 0) AS "total"
                    FROM "Return"
                    WHERE "createdAt" >= ${monthAgo}
                    GROUP BY DATE("createdAt")
                    ORDER BY DATE("createdAt") ASC
                  `,
        ),
    ]);

    const dailySeries = Array.from({ length: 30 }, (_, index) => {
        const date = subDays(new Date(), 29 - index);
        const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const key = format(date, 'yyyy-MM-dd');

        return {
            label,
            key,
            sales: 0,
            returns: 0,
        };
    });

    const salesByDay = new Map<string, number>();
    const returnsByDay = new Map<string, number>();

    for (const row of salesByDayRows) {
        const key = format(new Date(row.day), 'yyyy-MM-dd');
        salesByDay.set(key, Number(row.total ?? 0));
    }

    for (const row of returnsByDayRows) {
        const key = format(new Date(row.day), 'yyyy-MM-dd');
        returnsByDay.set(key, Number(row.total ?? 0));
    }

    return {
        todaySales: Number(todaySales._sum.total ?? 0),
        todaySalesCount: todaySales._count,
        productsCount,
        lowStockItems,
        recentTransactions,
        recentReturns,
        todayExpenses: Number(expenseSummary._sum.amount ?? 0),
        chartData: dailySeries.map(({ key, label }) => ({
            label,
            sales: salesByDay.get(key) ?? 0,
            returns: returnsByDay.get(key) ?? 0,
        })),
    };
}
