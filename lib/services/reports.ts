import "server-only";

import { endOfDay, startOfDay } from "date-fns";

import { prisma } from "@/lib/db/prisma";
import { reportFilterSchema, type ReportFilterInput } from "@/lib/validations/report";

export async function getReportData(input: ReportFilterInput) {
  const filters = reportFilterSchema.parse(input);
  const start = startOfDay(new Date(filters.startDate));
  const end = endOfDay(new Date(filters.endDate));
  const cashierFilter = filters.cashierId ? { cashierId: filters.cashierId } : {};

  const salesWhere = {
    createdAt: {
      gte: start,
      lte: end,
    },
    ...cashierFilter,
  };

  const returnWhere = {
    createdAt: {
      gte: start,
      lte: end,
    },
    ...(filters.cashierId ? { cashierId: filters.cashierId } : {}),
  };

  const [sales, saleItems, expenses, returns, cashierSales, stock, salesSummary, expenseSummary, returnSummary] =
    await Promise.all([
    prisma.sale.findMany({
      where: salesWhere,
      select: {
        id: true,
        invoiceNumber: true,
        paymentMethod: true,
        total: true,
        createdAt: true,
        cashier: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.saleItem.findMany({
      where: {
        sale: salesWhere,
      },
      select: {
        id: true,
        productNameSnapshot: true,
        productBarcodeSnapshot: true,
        buyingPriceSnapshot: true,
        lineTotal: true,
        quantity: true,
        sale: {
          select: {
            invoiceNumber: true,
            cashier: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
    }),
    prisma.expense.findMany({
      where: {
        expenseDate: {
          gte: start,
          lte: end,
        },
      },
      select: {
        id: true,
        title: true,
        amount: true,
        expenseDate: true,
        category: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { expenseDate: "desc" },
    }),
    prisma.return.findMany({
      where: returnWhere,
      select: {
        id: true,
        returnNumber: true,
        refundAmount: true,
        createdAt: true,
        cashier: {
          select: {
            fullName: true,
          },
        },
        sale: {
          select: {
            invoiceNumber: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.sale.groupBy({
      by: ["cashierId"],
      where: salesWhere,
      _sum: {
        total: true,
      },
      _count: true,
    }),
    prisma.product.findMany({
      select: {
        id: true,
        name: true,
        barcode: true,
        stockQuantity: true,
        lowStockLimit: true,
        sellingPrice: true,
        category: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { stockQuantity: "asc" },
    }),
    prisma.sale.aggregate({
      where: salesWhere,
      _sum: {
        total: true,
      },
    }),
    prisma.expense.aggregate({
      where: {
        expenseDate: {
          gte: start,
          lte: end,
        },
      },
      _sum: {
        amount: true,
      },
    }),
    prisma.return.aggregate({
      where: returnWhere,
      _sum: {
        refundAmount: true,
      },
    }),
  ]);

  const summary = {
    salesTotal: Number(salesSummary._sum.total ?? 0),
    expenseTotal: Number(expenseSummary._sum.amount ?? 0),
    returnTotal: Number(returnSummary._sum.refundAmount ?? 0),
  };

  const profitTotal = saleItems.reduce((sum, item) => {
    const cost = Number(item.buyingPriceSnapshot) * item.quantity;
    const revenue = Number(item.lineTotal);
    return sum + (revenue - cost);
  }, 0);

  const bestSellingMap = new Map<
    string,
    {
      productName: string;
      barcode: string;
      quantity: number;
      salesTotal: number;
    }
  >();

  for (const item of saleItems) {
    const current = bestSellingMap.get(item.productNameSnapshot) ?? {
      productName: item.productNameSnapshot,
      barcode: item.productBarcodeSnapshot,
      quantity: 0,
      salesTotal: 0,
    };

    current.quantity += item.quantity;
    current.salesTotal += Number(item.lineTotal);
    bestSellingMap.set(item.productNameSnapshot, current);
  }

  const cashierIds = cashierSales.map((row) => row.cashierId);
  const cashiers = cashierIds.length
    ? await prisma.user.findMany({
        where: { id: { in: cashierIds } },
      })
    : [];

  const cashierLookup = new Map(cashiers.map((cashier) => [cashier.id, cashier]));

  const cashierSummary = cashierSales.map((row) => ({
    cashierId: row.cashierId,
    cashierName: cashierLookup.get(row.cashierId)?.fullName ?? "Unknown",
    totalSales: Number(row._sum.total ?? 0),
    saleCount: row._count,
  }));

  return {
    filters,
    summary: {
      ...summary,
      profitTotal,
      netSales: summary.salesTotal - summary.returnTotal,
    },
    sales,
    saleItems,
    expenses,
    returns,
    bestSellingProducts: Array.from(bestSellingMap.values()).sort((a, b) => b.quantity - a.quantity),
    stock,
    cashierSummary,
  };
}
