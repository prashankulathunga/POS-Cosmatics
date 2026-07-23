import type { PaymentMethod, Prisma, StockMovementType, UserRole } from '@prisma/client';
import type { ReportFilterInput } from '@/lib/validations/report';

export type SessionUser = {
    id: string;
    username: string;
    fullName: string;
    role: UserRole;
};

export type SessionPayload = SessionUser & {
    exp?: number;
    iat?: number;
};

export type DashboardLowStockItem = Prisma.ProductGetPayload<{
    select: {
        id: true;
        name: true;
        barcode: true;
        stockQuantity: true;
        lowStockLimit: true;
    };
}>;

export type DashboardRecentTransaction = Prisma.SaleGetPayload<{
    include: {
        cashier: true;
    };
}>;

export type DashboardRecentReturn = Prisma.ReturnGetPayload<{
    include: {
        sale: true;
    };
}>;

export type DashboardChartPoint = {
    label: string;
    sales: number;
    returns: number;
};

export type DashboardData = {
    todaySales: number;
    todaySalesCount: number;
    productsCount: number;
    lowStockItems: DashboardLowStockItem[];
    recentTransactions: DashboardRecentTransaction[];
    recentReturns: DashboardRecentReturn[];
    todayExpenses: number;
    chartData: DashboardChartPoint[];
};

export type ReportSale = Prisma.SaleGetPayload<{
    select: {
        id: true;
        invoiceNumber: true;
        paymentMethod: true;
        total: true;
        createdAt: true;
        cashier: {
            select: {
                id: true;
                fullName: true;
            };
        };
    };
}>;

export type ReportSaleItem = Prisma.SaleItemGetPayload<{
    select: {
        id: true;
        productNameSnapshot: true;
        productBarcodeSnapshot: true;
        buyingPriceSnapshot: true;
        lineTotal: true;
        quantity: true;
        sale: {
            select: {
                invoiceNumber: true;
                cashier: {
                    select: {
                        fullName: true;
                    };
                };
            };
        };
    };
}>;

export type ReportExpense = Prisma.ExpenseGetPayload<{
    select: {
        id: true;
        title: true;
        amount: true;
        expenseDate: true;
        category: {
            select: {
                name: true;
            };
        };
    };
}>;

export type ReportReturn = Prisma.ReturnGetPayload<{
    select: {
        id: true;
        returnNumber: true;
        refundAmount: true;
        createdAt: true;
        cashier: {
            select: {
                fullName: true;
            };
        };
        sale: {
            select: {
                invoiceNumber: true;
            };
        };
    };
}>;

export type ReportStockItem = Prisma.ProductGetPayload<{
    select: {
        id: true;
        name: true;
        barcode: true;
        stockQuantity: true;
        lowStockLimit: true;
        sellingPrice: true;
        category: {
            select: {
                name: true;
            };
        };
    };
}>;

export type ReportBestSellingProduct = {
    productName: string;
    barcode: string;
    quantity: number;
    salesTotal: number;
};

export type ReportCashierSummary = {
    cashierId: string;
    cashierName: string;
    totalSales: number;
    saleCount: number;
};

export type ReportData = {
    filters: ReportFilterInput;

    summary: {
        salesTotal: number;
        expenseTotal: number;
        returnTotal: number;
        profitTotal: number;
        netSales: number;
    };

    sales: ReportSale[];
    saleItems: ReportSaleItem[];
    expenses: ReportExpense[];
    returns: ReportReturn[];
    bestSellingProducts: ReportBestSellingProduct[];
    stock: ReportStockItem[];
    cashierSummary: ReportCashierSummary[];
};

export type PosProductSummary = {
    id: string;
    name: string;
    barcode: string;
    stockQuantity: number;
    sellingPrice: string | number;
    category: {
        name: string;
    } | null;
};

export type PosRecentSaleSummary = {
    id: string;
    invoiceNumber: string;
    cashier: {
        fullName: string;
    };
};

export type ProductFormCategory = {
    id: string;
    name: string;
};

export type ProductFormProduct = {
    id: string;
    name: string;
    barcode: string;
    categoryId: string | null;
    buyingPrice: number;
    sellingPrice: number;
    stockQuantity: number;
    lowStockLimit: number;
    isActive: boolean;
};

export type InventoryAdjustProduct = {
    id: string;
    name: string;
    barcode: string;
    stockQuantity: number;
    lowStockLimit: number;
    category: {
        name: string;
    } | null;
};

export type ExpenseDialogExpense = {
    id: string;
    title: string;
    amount: number;
    note: string | null;
    expenseDate: string;
    categoryId: string | null;
};

export type ExpenseDialogCategory = {
    id: string;
    name: string;
};

export type ExpenseListItem = ExpenseDialogExpense & {
    category: {
        name: string;
    } | null;
    createdBy: {
        fullName: string;
    } | null;
};

export type ExpenseListData = {
    items: ExpenseListItem[];
    categories: ExpenseDialogCategory[];
    page: number;
    totalCount: number;
    totalPages: number;
    totalAmount: number;
};

export type ProductListItem = Prisma.ProductGetPayload<{
    include: {
        category: true;
    };
}>;

export type SaleWithDetails = Prisma.SaleGetPayload<{
    include: {
        cashier: true;
        items: true;
        payment: true;
    };
}>;

export type ReturnWithDetails = Prisma.ReturnGetPayload<{
    include: {
        cashier: true;
        items: true;
        sale: {
            include: {
                cashier: true;
            };
        };
    };
}>;

export type StockMovementWithProduct = Prisma.StockMovementGetPayload<{
    include: {
        product: true;
        createdBy: true;
    };
}>;

export type CompleteSaleItemInput = {
    productId: string;
    quantity: number;
    discountAmount: number;
};

export type CompleteSaleInput = {
    items: CompleteSaleItemInput[];
    cartDiscount: number;
    paidAmount: number;
    paymentMethod: PaymentMethod;
    note?: string;
};

export type ManualStockAdjustmentInput = {
    productId: string;
    quantityChange: number;
    note: string;
    type: StockMovementType;
};
