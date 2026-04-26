import 'server-only';

import { format, subDays } from 'date-fns';

import { prisma } from '@/lib/db/prisma';

export async function getDashboardData(role: 'ADMIN' | 'CASHIER', userId: string) {
    const now = new Date();

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const monthAgo = subDays(now, 29);

    const saleWhere = role === 'CASHIER' ? { cashierId: userId } : {};

    const todaySalesWhere = {
        ...saleWhere,
        createdAt: { gte: todayStart },
    };

    const [
        todaySales,
        productsCount,
        lowStockCandidates,
        recentTransactions,
        recentReturns,
        expenseSummary,
        sales,
        returns,
    ] = await Promise.all([
        prisma.sale.aggregate({
            where: todaySalesWhere,
            _sum: {
                total: true,
            },
            _count: true,
        }),
        prisma.product.count({ where: { isActive: true } }),
        prisma.product.findMany({
            where: { isActive: true },
            orderBy: { stockQuantity: 'asc' },
            select: {
                id: true,
                name: true,
                barcode: true,
                stockQuantity: true,
                lowStockLimit: true,
            },
            take: 50,
        }),
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
        prisma.sale.findMany({
            where: {
                ...saleWhere,
                createdAt: { gte: monthAgo },
            },
            select: {
                createdAt: true,
                total: true,
            },
            orderBy: { createdAt: 'asc' },
        }),
        prisma.return.findMany({
            where: {
                ...(role === 'CASHIER' ? { cashierId: userId } : {}),
                createdAt: { gte: monthAgo },
            },
            select: {
                createdAt: true,
                refundAmount: true,
            },
        }),
    ]);

    const dailySeries = Array.from({ length: 30 }, (_, index) => {
        const date = subDays(now, 29 - index);
        const label = format(date, 'MMM d');
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

    for (const sale of sales) {
        const key = format(sale.createdAt, 'yyyy-MM-dd');
        salesByDay.set(key, (salesByDay.get(key) ?? 0) + Number(sale.total));
    }

    for (const row of returns) {
        const key = format(row.createdAt, 'yyyy-MM-dd');
        returnsByDay.set(key, (returnsByDay.get(key) ?? 0) + Number(row.refundAmount));
    }

    return {
        todaySales: Number(todaySales._sum.total ?? 0),
        todaySalesCount: todaySales._count,
        productsCount,
        lowStockItems: lowStockCandidates
            .filter((product) => product.stockQuantity <= product.lowStockLimit)
            .slice(0, 5),
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
