import "server-only";

import { Prisma } from "@prisma/client";
import { endOfDay, startOfDay } from "date-fns";

import { prisma } from "@/lib/db/prisma";
import { reportFilterSchema, type ReportFilterInput } from "@/lib/validations/report";

type ReportDataOptions = {
  preview?: boolean;
};

type ProfitRow = {
  profitTotal: unknown;
};

export async function getReportData(input: ReportFilterInput, options: ReportDataOptions = {}) {
  const filters = reportFilterSchema.parse(input);
  const start = startOfDay(new Date(filters.startDate));
  const end = endOfDay(new Date(filters.endDate));
  const cashierFilter = filters.cashierId ? { cashierId: filters.cashierId } : {};
  const previewTake = options.preview ? 12 : undefined;

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

  const [
    sales,
    saleItems,
    expenses,
    returns,
    cashierSales,
    stock,
    salesSummary,
    expenseSummary,
    returnSummary,
    profitRows,
    bestSellingRows,
  ] =
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
      take: previewTake,
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
      orderBy: { createdAt: "desc" },
      take: options.preview ? 50 : undefined,
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
      take: previewTake,
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
      take: previewTake,
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
      take: options.preview ? 50 : undefined,
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
    prisma.$queryRaw<ProfitRow[]>(
      filters.cashierId
        ? Prisma.sql`
            SELECT COALESCE(SUM(si."lineTotal" - (si."buyingPriceSnapshot" * si."quantity")), 0) AS "profitTotal"
            FROM "SaleItem" si
            INNER JOIN "Sale" s ON s."id" = si."saleId"
            WHERE s."createdAt" >= ${start}
              AND s."createdAt" <= ${end}
              AND s."cashierId" = ${filters.cashierId}
          `
        : Prisma.sql`
            SELECT COALESCE(SUM(si."lineTotal" - (si."buyingPriceSnapshot" * si."quantity")), 0) AS "profitTotal"
            FROM "SaleItem" si
            INNER JOIN "Sale" s ON s."id" = si."saleId"
            WHERE s."createdAt" >= ${start}
              AND s."createdAt" <= ${end}
          `,
    ),
    prisma.saleItem.groupBy({
      by: ["productNameSnapshot", "productBarcodeSnapshot"],
      where: {
        sale: salesWhere,
      },
      _sum: {
        quantity: true,
        lineTotal: true,
      },
      orderBy: {
        _sum: {
          quantity: "desc",
        },
      },
      take: options.preview ? 12 : undefined,
    }),
  ]);

  const summary = {
    salesTotal: Number(salesSummary._sum.total ?? 0),
    expenseTotal: Number(expenseSummary._sum.amount ?? 0),
    returnTotal: Number(returnSummary._sum.refundAmount ?? 0),
  };

  const profitTotal = Number(profitRows[0]?.profitTotal ?? 0);

  const bestSellingProducts = bestSellingRows.map((item) => ({
    productName: item.productNameSnapshot,
    barcode: item.productBarcodeSnapshot,
    quantity: item._sum.quantity ?? 0,
    salesTotal: Number(item._sum.lineTotal ?? 0),
  }));

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
    bestSellingProducts,
    stock,
    cashierSummary,
  };
}
