import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { canAccessPath } from '@/lib/auth/permissions';
import { SESSION_COOKIE_NAME } from '@/lib/constants';
import { verifySessionToken } from '@/lib/auth/session';

const protectedPrefixes = [
    '/dashboard',
    '/pos',
    '/products',
    '/inventory',
    '/reports',
    '/expenses',
    '/returns',
    '/users',
    '/settings',
];

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await verifySessionToken(token);
    const isProtected = protectedPrefixes.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-current-pathname', pathname);

    if (!session && isProtected) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    if (session && pathname === '/login') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    if (session && isProtected && !canAccessPath(session.role, pathname)) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
