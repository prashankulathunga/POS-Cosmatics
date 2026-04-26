import type { UserRole } from '@prisma/client';
import {
    BarChart3,
    Boxes,
    CreditCard,
    LayoutDashboard,
    Package2,
    Receipt,
    RotateCcw,
    Settings2,
    ShoppingCart,
    Users2,
} from 'lucide-react';

export const SESSION_COOKIE_NAME = 'pos_session';
export const SETTINGS_ID = 'main-settings';
export const PAGE_SIZE = 10;
export const LOW_STOCK_LIMIT_FALLBACK = 5;

export const APP_NAME = 'POS Beauty';

export const ROLE_LABELS: Record<UserRole, string> = {
    ADMIN: 'Admin',
    CASHIER: 'Cashier',
};

export const NAV_ITEMS = [
    {
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        roles: ['ADMIN', 'CASHIER'] as UserRole[],
    },
    {
        title: 'Sales / POS',
        href: '/pos',
        icon: ShoppingCart,
        roles: ['ADMIN', 'CASHIER'] as UserRole[],
    },
    {
        title: 'Products',
        href: '/products',
        icon: Package2,
        roles: ['ADMIN'] as UserRole[],
    },
    {
        title: 'Inventory',
        href: '/inventory',
        icon: Boxes,
        roles: ['ADMIN'] as UserRole[],
    },
    {
        title: 'Reports',
        href: '/reports',
        icon: BarChart3,
        roles: ['ADMIN'] as UserRole[],
    },
    {
        title: 'Expenses',
        href: '/expenses',
        icon: CreditCard,
        roles: ['ADMIN'] as UserRole[],
    },
    {
        title: 'Returns',
        href: '/returns',
        icon: RotateCcw,
        roles: ['ADMIN', 'CASHIER'] as UserRole[],
    },
    {
        title: 'Users',
        href: '/users',
        icon: Users2,
        roles: ['ADMIN'] as UserRole[],
    },
    {
        title: 'Settings',
        href: '/settings',
        icon: Settings2,
        roles: ['ADMIN'] as UserRole[],
    },
    {
        title: 'Logout',
        href: '/logout',
        icon: Receipt,
        roles: ['ADMIN', 'CASHIER'] as UserRole[],
    },
] as const;

export const CURRENCY_CODES = [
    { label: 'Sri Lankan Rupee', code: 'LKR', symbol: 'Rs.' },
] as const;

export const DASHBOARD_TIME_RANGES = [
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
] as const;

export const REPORT_TYPES = [
    'daily-sales',
    'weekly-sales',
    'monthly-sales',
    'profit',
    'best-selling-products',
    'stock',
    'expenses',
    'sales-by-cashier',
] as const;
