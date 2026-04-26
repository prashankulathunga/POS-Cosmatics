import { type ClassValue, clsx } from 'clsx';
import { format, formatDistanceToNowStrict, startOfDay } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
    return clsx(inputs);
}

export function formatCurrency(value: number | string, currency = 'LKR', locale = 'en-LK') {
    const amount = typeof value === 'string' ? Number(value) : value;
    const currencyCode = currency === 'LKR' ? currency : 'LKR';

    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 2,
    }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatDateTime(value: Date | string, pattern = 'dd MMM yyyy, hh:mm a') {
    return format(new Date(value), pattern);
}

export function formatShortDate(value: Date | string) {
    return format(new Date(value), 'dd MMM yyyy');
}

export function formatRelative(value: Date | string) {
    return formatDistanceToNowStrict(new Date(value), { addSuffix: true });
}

export function toNumber(value: number | string) {
    const next = typeof value === 'string' ? Number(value) : value;
    return Number.isFinite(next) ? next : 0;
}

export function toMoney(value: number | string) {
    return Number(toNumber(value).toFixed(2));
}

export function getTodayRange() {
    const start = startOfDay(new Date());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
}

export function generateInvoiceNumber(date = new Date()) {
    return `INV-${format(date, 'yyyyMMdd-HHmmssSSS')}`;
}

export function generateReturnNumber(date = new Date()) {
    return `RET-${format(date, 'yyyyMMdd-HHmmssSSS')}`;
}

export function generateInternalCode(nextCount: number) {
    return `P-${nextCount.toString().padStart(5, '0')}`;
}

export function generateBarcode(seed: number) {
    return `8901000${seed.toString().padStart(5, '0')}`;
}

export function slugify(value: string) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}
