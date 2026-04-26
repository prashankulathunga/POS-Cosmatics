import type { PaymentMethod, Prisma, StockMovementType, UserRole } from '@prisma/client';

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
