import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { jwtVerify, SignJWT } from 'jose';

import { SESSION_COOKIE_NAME } from '@/lib/constants';
import { env } from '@/lib/env';
import type { SessionPayload, SessionUser } from '@/lib/types';

const secret = new TextEncoder().encode(env.AUTH_SECRET);

export async function signSessionToken(payload: SessionUser) {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(secret);
}

export async function verifySessionToken(token?: string) {
    if (!token) {
        return null;
    }

    try {
        const { payload } = await jwtVerify(token, secret);
        return payload as SessionPayload;
    } catch {
        return null;
    }
}

export async function getSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    return verifySessionToken(token);
}

export async function createSession(user: SessionUser) {
    const token = await signSessionToken(user);
    const cookieStore = await cookies();

    cookieStore.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
    });
}

export async function destroySession() {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function requireSession() {
    const session = await getSession();

    if (!session) {
        redirect('/login');
    }

    return session;
}

export async function requireRole(roles: SessionUser['role'][]) {
    const session = await requireSession();

    if (!roles.includes(session.role)) {
        redirect('/dashboard');
    }

    return session;
}
