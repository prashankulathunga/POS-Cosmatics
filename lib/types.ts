import type {
    PaymentMethod,
    Prisma,
    StockMovementType,
    UserRole,
} from '@prisma/client';

import type { REPORT_TYPES } from '@/lib/constants';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

export type ReportType = (typeof REPORT_TYPES)[number];

export type PaginationMeta = {
    page: number;
    totalCount: number;
    totalPages: number;
};

export type CategoryName = {
    name: string;
};

export type CashierName = {
    fullName: string;
};

// ---------------------------------------------------------------------------
// Authentication and session
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// POS
// ---------------------------------------------------------------------------

export type PosProductSummary = {
    id: string;
    name: string;
    barcode: string;
    stockQuantity: number;
    sellingPrice: number;
    category: CategoryName | null;
};

export type PosRecentSaleSummary = {
    id: string;
    invoiceNumber: string;
    cashier: CashierName;
};

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

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

export type ProductListItem = ProductFormProduct & {
    category: CategoryName | null;
};

export type ProductListData = PaginationMeta & {
    items: ProductListItem[];
    categories: ProductFormCategory[];
};

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export type InventoryAdjustProduct = {
    id: string;
    name: string;
    barcode: string;
    stockQuantity: number;
    lowStockLimit: number;
    category: CategoryName | null;
};

export type StockMovementWithProduct = Prisma.StockMovementGetPayload<{
    include: {
        product: true;
        createdBy: true;
    };
}>;

export type InventoryListData = PaginationMeta & {
    products: InventoryAdjustProduct[];
    movements: StockMovementWithProduct[];
    lowStockCount: number;
};

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

export type ExpenseDialogCategory = {
    id: string;
    name: string;
};

export type ExpenseDialogExpense = {
    id: string;
    title: string;
    amount: number;
    note: string | null;
    expenseDate: string;
    categoryId: string | null;
};

export type ExpenseListItem = ExpenseDialogExpense & {
    category: CategoryName | null;
    createdBy: CashierName | null;
};

export type ExpenseListData = PaginationMeta & {
    items: ExpenseListItem[];
    categories: ExpenseDialogCategory[];
    totalAmount: number;
};

// ---------------------------------------------------------------------------
// Users
// Do not send passwordHash to a Client Component.
// ---------------------------------------------------------------------------

export type UserFormUser = {
    id: string;
    username: string;
    email: string | null;
    fullName: string;
    role: UserRole;
    isActive: boolean;
};

export type UserListItem = UserFormUser & {
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
};

export type UserListData = PaginationMeta & {
    items: UserListItem[];
};

// ---------------------------------------------------------------------------
// Sales and returns
// ---------------------------------------------------------------------------

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

export type ReturnHistoryItem = Prisma.ReturnGetPayload<{
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

export type ReturnableSaleItem = {
    id: string;
    productNameSnapshot: string;
    productBarcodeSnapshot: string;
    quantity: number;
    returnedQty: number;
    remainingQty: number;
    refundableUnitPrice: number;
};

export type ReturnableSale = {
    id: string;
    invoiceNumber: string;
    createdAt: string;
    cashier: CashierName;
    items: ReturnableSaleItem[];
};

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

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
    select: {
        id: true;
        invoiceNumber: true;
        createdAt: true;
        total: true;
        cashier: {
            select: {
                fullName: true;
            };
        };
    };
}>;

export type DashboardRecentReturn = Prisma.ReturnGetPayload<{
    select: {
        id: true;
        returnNumber: true;
        createdAt: true;
        refundAmount: true;
        sale: {
            select: {
                invoiceNumber: true;
            };
        };
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

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export type ReportFilter = {
    type: ReportType;
    startDate: string;
    endDate: string;
    cashierId?: string;
};

export type ReportSummary = {
    salesTotal: number;
    expenseTotal: number;
    returnTotal: number;
    profitTotal: number;
    netSales: number;
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

export type ReportCashierOption = {
    id: string;
    fullName: string;
};

export type ReportData = {
    filters: ReportFilter;
    summary: ReportSummary;
    sales: ReportSale[];
    saleItems: ReportSaleItem[];
    expenses: ReportExpense[];
    returns: ReportReturn[];
    bestSellingProducts: ReportBestSellingProduct[];
    stock: ReportStockItem[];
    cashierSummary: ReportCashierSummary[];
};

// ---------------------------------------------------------------------------
// Service/action inputs
// ---------------------------------------------------------------------------

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

export type ProcessReturnItemInput = {
    saleItemId: string;
    quantity: number;
};

export type ProcessReturnInput = {
    saleId: string;
    reason?: string;
    items: ProcessReturnItemInput[];
};
