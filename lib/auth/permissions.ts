import type { UserRole } from '@prisma/client';

const ADMIN_ONLY_PREFIXES = [
    '/products',
    '/inventory',
    '/reports',
    '/expenses',
    '/users',
    '/settings',
];
const CASHIER_ALLOWED_PREFIXES = ['/dashboard', '/pos', '/returns'];

export function canAccessPath(role: UserRole, pathname: string) {
    if (pathname === '/' || pathname === '/login') {
        return true;
    }

    if (role === 'ADMIN') {
        return true;
    }

    return CASHIER_ALLOWED_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
}

export function isAdminOnlyPath(pathname: string) {
    return ADMIN_ONLY_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
}
