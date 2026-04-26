import { createSign } from 'node:crypto';

import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth/session';

export const runtime = 'nodejs';

type QzSignRequest = {
    request?: unknown;
};

type ErrorResponse = {
    error: string;
};

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

function signatureResponse(signature: string) {
    return new NextResponse(signature, {
        status: 200,
        headers: {
            'Cache-Control': 'no-store',
            'Content-Type': 'text/plain; charset=utf-8',
        },
    });
}

function errorResponse(message: string, status: number) {
    return NextResponse.json(
        { error: message } satisfies ErrorResponse,
        {
            status,
            headers: {
                'Cache-Control': 'no-store',
            },
        },
    );
}

function getPrivateKey() {
    const privateKey = process.env.QZ_PRIVATE_KEY;

    if (!privateKey?.trim()) {
        throw new Error(
            'QZ_PRIVATE_KEY is not configured. Add it to .env.local and restart the Next.js server.',
        );
    }

    // .env.local stores the PEM on one line with literal "\n" separators.
    return privateKey.replace(/\\n/g, '\n').trim();
}

async function readJsonSignRequest(request: Request) {
    const payload = (await request.json()) as unknown;

    if (!payload || typeof payload !== 'object') {
        return null;
    }

    const qzRequest = (payload as QzSignRequest).request;

    return isNonEmptyString(qzRequest) ? qzRequest.trim() : null;
}

async function readQzSignRequest(request: Request) {
    const urlRequest = new URL(request.url).searchParams.get('request');

    if (isNonEmptyString(urlRequest)) {
        return urlRequest.trim();
    }

    const contentType = request.headers.get('content-type') ?? '';

    try {
        if (contentType.includes('application/json')) {
            return readJsonSignRequest(request);
        }

        if (contentType.includes('application/x-www-form-urlencoded')) {
            const formData = await request.formData();
            const qzRequest = formData.get('request');

            return isNonEmptyString(qzRequest) ? qzRequest.trim() : null;
        }

        const bodyText = (await request.text()).trim();

        if (!bodyText) {
            return null;
        }

        if (bodyText.startsWith('request=')) {
            const params = new URLSearchParams(bodyText);
            const qzRequest = params.get('request');

            return isNonEmptyString(qzRequest) ? qzRequest.trim() : null;
        }

        return bodyText;
    } catch {
        return null;
    }
}

function signQzRequest(qzRequest: string) {
    const signer = createSign('RSA-SHA512');

    signer.update(qzRequest, 'utf8');
    signer.end();

    return signer.sign(getPrivateKey(), 'base64');
}

async function handleSignRequest(request: Request) {
    const session = await getSession();

    if (!session) {
        return errorResponse('Unauthorized', 401);
    }

    const qzRequest = await readQzSignRequest(request);

    if (!qzRequest) {
        return errorResponse('Missing QZ signing request.', 400);
    }

    try {
        const signature = signQzRequest(qzRequest);

        return signatureResponse(signature);
    } catch (error) {
        console.error('QZ signing failed', error);
        return errorResponse(
            'QZ signature API failed. Check that QZ_PRIVATE_KEY matches public/digital-certificate.txt.',
            500,
        );
    }
}

export async function GET(request: Request) {
    return handleSignRequest(request);
}

export async function POST(request: Request) {
    return handleSignRequest(request);
}
