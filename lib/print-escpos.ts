'use client';

import { formatDateTime, toMoney } from '@/lib/utils';

const ESC = '\x1B';
const GS = '\x1D';
const LF = '\x0A';

const RECEIPT_WIDTH = 48;
const SHOP_NAME_PRINT_WIDTH = 72;
const DEFAULT_RECEIPT_SHOP_NAME = 'BLISSORA';
const LEGACY_RECEIPT_SHOP_NAME = 'POS Beauty Store';
const DEFAULT_LOGO_PUBLIC_PATH = process.env.NEXT_PUBLIC_RECEIPT_LOGO_PATH ?? '/Bls-rm.png';
const DEFAULT_QZ_ENCODING = process.env.NEXT_PUBLIC_RECEIPT_ENCODING ?? 'Cp437';
const QZ_SCRIPT_WAIT_TIMEOUT_MS = 8000;

export const DEFAULT_RECEIPT_PRINTER_NAME =
    process.env.NEXT_PUBLIC_RECEIPT_PRINTER_NAME ?? 'POS-80';

export type ReceiptPayload = {
    sale: {
        invoiceNumber: string;
        createdAt: string;
        paymentMethod: string;
        subtotal: string | number;
        itemDiscount?: string | number;
        cartDiscount?: string | number;
        total: string | number;
        paidAmount: string | number;
        balance: string | number;
        note?: string | null;
        cashier: {
            fullName: string;
        };
        items: Array<{
            id: string;
            productNameSnapshot: string;
            quantity: number;
            sellingPriceSnapshot: string | number;
            discountAmount: string | number;
            lineTotal: string | number;
        }>;
    };
    settings: {
        shopName: string;
        address: string;
        phone: string;
        receiptHeader?: string | null;
        receiptFooter?: string | null;
        currencyCode: string;
    };
};

export type ReceiptPrintMode = 'text-only' | 'with-logo' | 'with-barcode' | 'with-logo-and-barcode';

export type ReceiptPrinterOptions = {
    printerName?: string;
    enableLogo?: boolean;
    enableBarcode?: boolean;
    forceRaw?: boolean;
    encoding?: string;
    logoPath?: string;
    jobName?: string;
    connectRetries?: number;
    connectDelay?: number;
    keepAlive?: number;
    cutPaper?: boolean;
    feedLines?: number;
    allowPrinterFallback?: boolean;
};

type NormalizedReceiptPrinterOptions = {
    printerName: string;
    enableLogo: boolean;
    enableBarcode: boolean;
    forceRaw: boolean;
    encoding: string;
    logoPath: string;
    jobName: string;
    connectRetries: number;
    connectDelay: number;
    keepAlive: number;
    cutPaper: boolean;
    feedLines: number;
    allowPrinterFallback: boolean;
};

type QzConfigOptions = {
    encoding?: string;
    forceRaw?: boolean;
    jobName?: string;
};

type QzPixelImageOptions = {
    language?: 'ESCPOS' | string;
    dotDensity?: 'single' | 'double' | string;
};

type QzPixelImageData = {
    type: 'pixel';
    format: 'image';
    flavor: 'base64';
    data: string;
    options?: QzPixelImageOptions;
};

type QzPrintDataItem = string | QzPixelImageData;
type QzTrayConfig = unknown;
type PrinterDetail = Record<string, unknown>;
type QzResolve<T = string> = (value: T | PromiseLike<T>) => void;
type QzReject = (reason?: unknown) => void;
type QzPromiseCallback<T = string> = (resolve: QzResolve<T>, reject: QzReject) => void;

interface QzTrayApi {
    configs: {
        create(printer: string, options?: QzConfigOptions): QzTrayConfig;
    };
    print(config: QzTrayConfig, data: QzPrintDataItem[]): Promise<unknown>;
    printers: {
        details(): Promise<PrinterDetail[] | PrinterDetail>;
        find(query?: string): Promise<string | string[]>;
        getDefault?(): Promise<string>;
    };
    websocket: {
        connect(options?: {
            delay?: number;
            keepAlive?: number;
            retries?: number;
        }): Promise<unknown>;
        isActive(): boolean;
    };
    security: {
        setCertificatePromise(
            callback: QzPromiseCallback,
            options?: { rejectOnFailure?: boolean },
        ): void;
        setSignatureAlgorithm(algorithm: 'SHA1' | 'SHA256' | 'SHA512'): void;
        setSignaturePromise(
            callback: (request: string) => QzPromiseCallback | Promise<string>,
        ): void;
    };
}

type QzWindow = Window & {
    qz?: QzTrayApi;
};

class ReceiptPrinterError extends Error {
    constructor(
        message: string,
        readonly cause?: unknown,
    ) {
        super(message);
        this.name = 'ReceiptPrinterError';
    }
}

let qzSecuritySetupPromise: Promise<void> | null = null;
let qzSecurityConfigured = false;
let qzConnectionPromise: Promise<void> | null = null;
let logoDataUrlPromise: Promise<string | null> | null = null;
let printQueue: Promise<void> = Promise.resolve();

function readBooleanEnv(value: string | undefined, defaultValue: boolean) {
    if (value == null || value.trim() === '') return defaultValue;

    const normalized = value.trim().toLowerCase();

    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;

    return defaultValue;
}

const DEFAULT_ENABLE_LOGO = readBooleanEnv(process.env.NEXT_PUBLIC_RECEIPT_ENABLE_LOGO, false);
const DEFAULT_ENABLE_BARCODE = readBooleanEnv(
    process.env.NEXT_PUBLIC_RECEIPT_ENABLE_BARCODE,
    false,
);
const DEFAULT_FORCE_RAW = readBooleanEnv(process.env.NEXT_PUBLIC_RECEIPT_FORCE_RAW, true);

function logInfo(message: string, details?: unknown) {
    if (details === undefined) {
        console.info(`[Receipt/QZ] ${message}`);
        return;
    }

    console.info(`[Receipt/QZ] ${message}`, details);
}

function logWarn(message: string, details?: unknown) {
    if (details === undefined) {
        console.warn(`[Receipt/QZ] ${message}`);
        return;
    }

    console.warn(`[Receipt/QZ] ${message}`, details);
}

function logError(message: string, details?: unknown) {
    if (details === undefined) {
        console.error(`[Receipt/QZ] ${message}`);
        return;
    }

    console.error(`[Receipt/QZ] ${message}`, details);
}

function getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    if (error == null) return 'Unknown error';

    try {
        return JSON.stringify(error);
    } catch {
        return String(error);
    }
}

function rejectQzPromise(reject: QzReject, message: string, error?: unknown) {
    const detail = error === undefined ? '' : getErrorMessage(error);
    reject(detail ? `${message}: ${detail}` : message);
}

function delay(ms: number) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getWindowQz() {
    if (typeof window === 'undefined') return undefined;

    return (window as QzWindow).qz;
}

async function waitForQzTrayScript(timeoutMs = QZ_SCRIPT_WAIT_TIMEOUT_MS) {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
        const qz = getWindowQz();

        if (qz) return qz;

        await delay(100);
    }

    return getWindowQz();
}

async function getQzTray() {
    if (typeof window === 'undefined') {
        logError('QZ script loaded: false', { reason: 'window is unavailable' });
        throw new ReceiptPrinterError(
            'Receipt printing must run in the browser on the POS machine.',
        );
    }

    const scriptElement =
        typeof document !== 'undefined' ? document.getElementById('qz-tray') : null;
    const qz = getWindowQz() ?? (await waitForQzTrayScript());

    logInfo('QZ script loaded', {
        loaded: Boolean(qz),
        scriptTagPresent: Boolean(scriptElement),
    });

    if (!qz) {
        throw new ReceiptPrinterError(
            'QZ Tray script is not loaded. Check the qz-tray.js script tag, network access, and NEXT_PUBLIC_QZ_TRAY_SCRIPT_SRC.',
        );
    }

    return qz;
}

function normalizeOptions(
    optionsOrPrinterName?: ReceiptPrinterOptions | string,
): NormalizedReceiptPrinterOptions {
    const options =
        typeof optionsOrPrinterName === 'string'
            ? { printerName: optionsOrPrinterName }
            : (optionsOrPrinterName ?? {});

    return {
        printerName: options.printerName ?? DEFAULT_RECEIPT_PRINTER_NAME,
        enableLogo: options.enableLogo ?? DEFAULT_ENABLE_LOGO,
        enableBarcode: options.enableBarcode ?? DEFAULT_ENABLE_BARCODE,
        forceRaw: options.forceRaw ?? DEFAULT_FORCE_RAW,
        encoding: options.encoding ?? DEFAULT_QZ_ENCODING,
        logoPath: options.logoPath ?? DEFAULT_LOGO_PUBLIC_PATH,
        jobName: options.jobName ?? 'Receipt',
        connectRetries: options.connectRetries ?? 3,
        connectDelay: options.connectDelay ?? 1,
        keepAlive: options.keepAlive ?? 60,
        cutPaper: options.cutPaper ?? true,
        feedLines: Math.max(2, Math.min(8, Math.trunc(options.feedLines ?? 5))),
        allowPrinterFallback: options.allowPrinterFallback ?? true,
    };
}

function getPrintMode(hasLogo: boolean, hasBarcode: boolean): ReceiptPrintMode {
    if (hasLogo && hasBarcode) return 'with-logo-and-barcode';
    if (hasLogo) return 'with-logo';
    if (hasBarcode) return 'with-barcode';
    return 'text-only';
}

function normalizePrinterList(printerList: string | string[]) {
    const printers = Array.isArray(printerList) ? printerList : [printerList];

    return printers.map((printer) => printer.trim()).filter(Boolean);
}

async function fetchText(url: string, label: string) {
    const response = await fetch(url, {
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { Accept: 'text/plain' },
    });

    const text = await response.text();

    if (!response.ok) {
        throw new Error(`${label} request failed with status ${response.status}: ${text}`);
    }

    const trimmedText = text.trim();

    if (!trimmedText) {
        throw new Error(`${label} response was empty.`);
    }

    return trimmedText;
}

export async function setupQzSecurity() {
    const qz = await getQzTray();

    if (qzSecurityConfigured) {
        logInfo('security configured', { alreadyConfigured: true });
        return;
    }

    if (qzSecuritySetupPromise) {
        logInfo('security setup already in progress');
        return qzSecuritySetupPromise;
    }

    qzSecuritySetupPromise = Promise.resolve()
        .then(() => {
            if (!qz.security) {
                throw new ReceiptPrinterError(
                    'QZ Tray security API is unavailable. Use QZ Tray 2.2.x and qz-tray.js from the same install/version.',
                );
            }

            qz.security.setSignatureAlgorithm('SHA512');

            qz.security.setCertificatePromise(
                (resolve, reject) => {
                    fetchText('/digital-certificate.txt', 'QZ certificate')
                        .then((certificate) => {
                            logInfo('security certificate loaded', {
                                length: certificate.length,
                            });
                            resolve(certificate);
                        })
                        .catch((error) => {
                            logError('security certificate failed', error);
                            rejectQzPromise(
                                reject,
                                'QZ certificate file missing or unreadable. Ensure public/digital-certificate.txt matches QZ_PRIVATE_KEY',
                                error,
                            );
                        });
                },
                { rejectOnFailure: true },
            );

            qz.security.setSignaturePromise((requestToSign) => (resolve, reject) => {
                fetch('/api/qz/sign', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    cache: 'no-store',
                    credentials: 'same-origin',
                    body: JSON.stringify({ request: requestToSign }),
                })
                    .then(async (response) => {
                        const responseText = (await response.text()).trim();

                        if (!response.ok) {
                            reject(
                                `QZ signature API failed (${response.status}): ${
                                    responseText || response.statusText
                                }`,
                            );
                            return;
                        }

                        if (!responseText) {
                            reject('QZ signature API returned an empty signature.');
                            return;
                        }

                        logInfo('security signature created', {
                            requestLength: requestToSign.length,
                            signatureLength: responseText.length,
                        });
                        resolve(responseText);
                    })
                    .catch((error) => {
                        logError('security signature failed', error);
                        rejectQzPromise(reject, 'QZ signature API failed', error);
                    });
            });

            qzSecurityConfigured = true;
            logInfo('security configured', { algorithm: 'SHA512' });
        })
        .catch((error) => {
            qzSecuritySetupPromise = null;
            qzSecurityConfigured = false;
            logError('security configured failed', error);
            throw error;
        });

    return qzSecuritySetupPromise;
}

async function ensureQzConnected(qz: QzTrayApi, options: NormalizedReceiptPrinterOptions) {
    const activeBefore = qz.websocket.isActive();

    logInfo('websocket status before connect', { active: activeBefore });

    if (activeBefore) {
        logInfo('websocket connected', { reusedConnection: true });
        return;
    }

    if (qzConnectionPromise) {
        await qzConnectionPromise;
        return;
    }

    qzConnectionPromise = qz.websocket
        .connect({
            retries: options.connectRetries,
            delay: options.connectDelay,
            keepAlive: options.keepAlive,
        })
        .then(() => {
            logInfo('websocket connected', {
                retries: options.connectRetries,
                delay: options.connectDelay,
                keepAlive: options.keepAlive,
            });
        })
        .catch((error) => {
            logError('websocket connected failed', error);
            throw new ReceiptPrinterError(
                `QZ Tray is not connected. Open QZ Tray on this POS machine, allow the certificate prompt, then try again. ${getErrorMessage(
                    error,
                )}`,
                error,
            );
        })
        .finally(() => {
            qzConnectionPromise = null;
        });

    return qzConnectionPromise;
}

function replaceUnsafeCharacters(value: string) {
    return value
        .replace(/\u00a0/g, ' ')
        .replace(/[\u2018\u2019\u201a\u201b]/g, "'")
        .replace(/[\u201c\u201d\u201e\u201f]/g, '"')
        .replace(/[\u2010-\u2015\u2212]/g, '-')
        .replace(/[\u00d7\u2715\u2716]/g, 'x')
        .replace(/\u2026/g, '...')
        .replace(/\u2022/g, '*')
        .replace(/\u20a8/g, 'Rs')
        .replace(/\u20b9/g, 'INR')
        .replace(/\u2122/g, '(TM)')
        .replace(/\u00ae/g, '(R)')
        .replace(/\u00a9/g, '(C)');
}

function cleanText(value: string | number | null | undefined, fallback = '') {
    const rawValue = value == null ? fallback : String(value);
    const normalized = replaceUnsafeCharacters(rawValue)
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\t/g, ' ')
        .replace(/[^\x0A\x20-\x7E]/g, '')
        .replace(/[ ]{2,}/g, ' ');

    return normalized.trim();
}

function cleanInlineText(value: string | number | null | undefined, fallback = '') {
    return cleanText(value, fallback).replace(/\n+/g, ' ').trim();
}

function wrapText(value: string | number | null | undefined, width = RECEIPT_WIDTH) {
    const text = cleanText(value);

    if (!text) return [];

    const wrappedLines: string[] = [];

    for (const paragraph of text.split('\n')) {
        const words = paragraph.split(/\s+/).filter(Boolean);

        if (words.length === 0) {
            wrappedLines.push('');
            continue;
        }

        let currentLine = '';

        for (const word of words) {
            if (!currentLine) {
                if (word.length <= width) {
                    currentLine = word;
                    continue;
                }

                let remaining = word;

                while (remaining.length > width) {
                    wrappedLines.push(remaining.slice(0, width));
                    remaining = remaining.slice(width);
                }

                currentLine = remaining;
                continue;
            }

            const nextLine = `${currentLine} ${word}`;

            if (nextLine.length <= width) {
                currentLine = nextLine;
                continue;
            }

            wrappedLines.push(currentLine);

            if (word.length <= width) {
                currentLine = word;
                continue;
            }

            let remaining = word;

            while (remaining.length > width) {
                wrappedLines.push(remaining.slice(0, width));
                remaining = remaining.slice(width);
            }

            currentLine = remaining;
        }

        if (currentLine) wrappedLines.push(currentLine);
    }

    return wrappedLines;
}

function centerLine(value: string | number | null | undefined, width = RECEIPT_WIDTH) {
    const text = cleanInlineText(value);

    if (text.length >= width) return text.slice(0, width);

    const leftPadding = Math.floor((width - text.length) / 2);
    return ' '.repeat(leftPadding) + text;
}

function makeColumnLine(left: string, right: string, width = RECEIPT_WIDTH) {
    const safeLeft = cleanInlineText(left);
    const safeRight = cleanInlineText(right);

    if (safeRight.length >= width) return safeRight.slice(0, width);

    const maxLeftWidth = width - safeRight.length - 1;
    const clippedLeft =
        safeLeft.length > maxLeftWidth ? safeLeft.slice(0, Math.max(0, maxLeftWidth)) : safeLeft;

    return clippedLeft + ' '.repeat(width - clippedLeft.length - safeRight.length) + safeRight;
}

function formatReceiptAmount(value: number | string, currencyCode: string) {
    const amount = toMoney(value);
    const prefix = cleanInlineText(currencyCode || 'LKR', 'LKR').toUpperCase();
    const formattedNumber = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        useGrouping: true,
    })
        .format(Math.abs(Number.isFinite(amount) ? amount : 0))
        .replace(/\u00a0/g, ' ');

    return cleanInlineText(`${amount < 0 ? '-' : ''}${prefix} ${formattedNumber}`);
}

function formatPaymentMethod(value: string) {
    return cleanInlineText(value, 'UNKNOWN').replace(/_/g, ' ').toUpperCase();
}

function initPrinter() {
    return ESC + '@' + ESC + 't' + '\x00';
}

function setAlignment(mode: 'left' | 'center' | 'right') {
    const map = {
        left: '\x00',
        center: '\x01',
        right: '\x02',
    };

    return ESC + 'a' + map[mode];
}

function setBold(enabled: boolean) {
    return ESC + 'E' + (enabled ? '\x01' : '\x00');
}

function setUnderline(enabled: boolean) {
    return ESC + '-' + (enabled ? '\x01' : '\x00');
}

function setTextSize(mode: 'normal' | 'double-height' | 'double-width' | 'double') {
    const map = {
        normal: '\x00',
        'double-height': '\x01',
        'double-width': '\x10',
        double: '\x11',
    };

    return GS + '!' + map[mode];
}

function feed(lines = 1) {
    const lineCount = Math.max(0, Math.min(255, Math.trunc(lines)));
    return ESC + 'd' + String.fromCharCode(lineCount);
}

function cutPaper() {
    return GS + 'V' + '\x42' + '\x00';
}

function divider(char = '-', width = RECEIPT_WIDTH) {
    return (
        cleanInlineText(char || '-')
            .slice(0, 1)
            .repeat(width) + LF
    );
}

function majorDivider() {
    return divider('=');
}

function getReceiptShopName(shopName: string) {
    const cleanShopName = cleanInlineText(shopName);

    if (!cleanShopName || cleanShopName === LEGACY_RECEIPT_SHOP_NAME) {
        return DEFAULT_RECEIPT_SHOP_NAME;
    }

    return cleanShopName;
}

function buildCode128BarcodeCommand(invoiceNumber: string) {
    const code = cleanInlineText(invoiceNumber)
        .toUpperCase()
        .replace(/[^\x20-\x7E]/g, '');

    if (!code) {
        throw new Error('Invoice number is empty, so barcode cannot be printed.');
    }

    const code128Payload = `{B${code}`;

    if (code128Payload.length > 255) {
        throw new Error('Invoice number is too long for ESC/POS Code 128 barcode printing.');
    }

    return (
        GS +
        'h' +
        String.fromCharCode(72) +
        GS +
        'w' +
        String.fromCharCode(2) +
        GS +
        'H' +
        String.fromCharCode(2) +
        GS +
        'f' +
        String.fromCharCode(0) +
        GS +
        'k' +
        String.fromCharCode(73) +
        String.fromCharCode(code128Payload.length) +
        code128Payload
    );
}

function blobToDataUrl(blob: Blob) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            const result = reader.result;

            if (typeof result !== 'string') {
                reject(new Error('Logo file could not be converted to a data URL.'));
                return;
            }

            resolve(result);
        };

        reader.onerror = () => {
            reject(reader.error ?? new Error('Failed to read logo file.'));
        };

        reader.readAsDataURL(blob);
    });
}

function dataUrlToBase64(dataUrl: string) {
    const commaIndex = dataUrl.indexOf(',');
    return commaIndex === -1 ? dataUrl : dataUrl.slice(commaIndex + 1);
}

async function getLogoDataUrl(logoPath: string) {
    if (logoDataUrlPromise) return logoDataUrlPromise;

    logoDataUrlPromise = fetch(logoPath, {
        cache: 'no-store',
        credentials: 'same-origin',
    })
        .then(async (response) => {
            if (!response.ok) {
                throw new Error(`request failed with status ${response.status}`);
            }

            const dataUrl = await blobToDataUrl(await response.blob());

            if (!dataUrl) {
                throw new Error('logo data URL was empty');
            }

            return dataUrl;
        })
        .catch((error) => {
            logoDataUrlPromise = null;
            logWarn(`Logo could not be loaded from ${logoPath}; continuing without logo.`, error);
            return null;
        });

    return logoDataUrlPromise;
}

async function buildLogoPrintItems(options: NormalizedReceiptPrinterOptions) {
    if (!options.enableLogo) return [];

    const logoDataUrl = await getLogoDataUrl(options.logoPath);

    if (!logoDataUrl) return [];

    return [
        setAlignment('center'),
        {
            type: 'pixel',
            format: 'image',
            flavor: 'base64',
            data: dataUrlToBase64(logoDataUrl),
            options: {
                language: 'ESCPOS',
                dotDensity: 'double',
            },
        },
        feed(1),
    ] satisfies QzPrintDataItem[];
}

function appendWrappedLines(lines: string[], value: string, width = RECEIPT_WIDTH) {
    for (const line of wrapText(value, width)) {
        lines.push(line + LF);
    }
}

function appendCenteredWrappedLines(lines: string[], value: string, width = RECEIPT_WIDTH) {
    for (const line of wrapText(value, width)) {
        lines.push(line + LF);
    }
}

function appendInvoicePlainText(lines: string[], invoiceNumber: string) {
    lines.push(setAlignment('center'));
    lines.push('Invoice for returns/exchange' + LF);
    lines.push(invoiceNumber + LF);
}

function appendBarcodeOrPlainText(lines: string[], invoiceNumber: string, enableBarcode: boolean) {
    if (!invoiceNumber) return false;

    lines.push(divider(), setAlignment('center'));

    if (!enableBarcode) {
        appendInvoicePlainText(lines, invoiceNumber);
        return false;
    }

    try {
        lines.push(
            setUnderline(true),
            setBold(true),
            'SCAN FOR RETURNS / EXCHANGE' + LF,
            setBold(false),
            setUnderline(false),
            feed(1),
            buildCode128BarcodeCommand(invoiceNumber),
            // invoiceNumber + LF,
        );

        return true;
    } catch (error) {
        logWarn('Barcode command could not be created; printing invoice number as text.', error);
        appendInvoicePlainText(lines, invoiceNumber);
        return false;
    }
}

function getDiscountTotal(data: ReceiptPayload) {
    const itemDiscount = data.sale.itemDiscount;
    const cartDiscount = data.sale.cartDiscount;

    if (itemDiscount != null || cartDiscount != null) {
        return Math.max(0, toMoney(itemDiscount ?? 0) + toMoney(cartDiscount ?? 0));
    }

    return Math.max(0, toMoney(data.sale.subtotal) - toMoney(data.sale.total));
}

function buildReceiptText(data: ReceiptPayload, options: NormalizedReceiptPrinterOptions) {
    const settings = data.settings ?? {
        shopName: DEFAULT_RECEIPT_SHOP_NAME,
        address: '',
        phone: '',
        receiptHeader: '',
        receiptFooter: '',
        currencyCode: 'LKR',
    };

    const shopName = getReceiptShopName(settings.shopName);
    const invoiceNumber = cleanInlineText(data.sale.invoiceNumber);
    const currencyCode = cleanInlineText(settings.currencyCode || 'LKR', 'LKR');
    const itemCount = data.sale.items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = toMoney(data.sale.subtotal);
    const total = toMoney(data.sale.total);
    const discountTotal = getDiscountTotal(data);
    const balance = toMoney(data.sale.balance);
    const changeLabel = balance < 0 ? 'Balance' : 'Change';

    const lines: string[] = [
        initPrinter(),
        setAlignment('center'),
        setTextSize('double-height'),
        setBold(true),
        feed(2),
        centerLine(shopName, SHOP_NAME_PRINT_WIDTH) + LF,
        setBold(false),
        setTextSize('normal'),
    ];

    console.log('Receipt shopName:', shopName);

    const address = cleanText(settings.address);

    if (address) {
        appendCenteredWrappedLines(lines, address);
    }

    const phone = cleanInlineText(settings.phone);

    if (phone) {
        lines.push(`Tel: ${phone}` + LF);
    }

    // const header = cleanText(settings.receiptHeader ?? '');

    // if (header) {
    //     lines.push(feed(1));
    //     appendCenteredWrappedLines(lines, header);
    // }

    // NOTE: remove above invoice number
    // lines.push(feed(1), majorDivider(), setBold(true));

    // if (invoiceNumber) {
    //     lines.push(`INVOICE # ${invoiceNumber}` + LF);
    // }

    lines.push(setBold(false), majorDivider(), setAlignment('left'));
    lines.push(
        makeColumnLine('Date/Time', formatDateTime(data.sale.createdAt, 'dd/MM/yyyy hh:mm a')) + LF,
    );
    lines.push(
        makeColumnLine('Cashier', cleanInlineText(data.sale.cashier.fullName, 'Unknown')) + LF,
    );
    lines.push(makeColumnLine('Payment', formatPaymentMethod(data.sale.paymentMethod)) + LF);
    lines.push(divider());

    lines.push(setBold(true));
    lines.push(makeColumnLine('ITEM / QTY x PRICE', 'AMOUNT') + LF);
    lines.push(setBold(false), divider());

    data.sale.items.forEach((item, index) => {
        const itemPrefix = `${index + 1}. `;
        const productName = cleanText(item.productNameSnapshot, 'Item') || 'Item';
        const nameLines = wrapText(productName, RECEIPT_WIDTH - itemPrefix.length);

        nameLines.forEach((nameLine, lineIndex) => {
            lines.push((lineIndex === 0 ? itemPrefix : '   ') + nameLine + LF);
        });

        const quantity = Number.isFinite(item.quantity) ? item.quantity : 0;
        const unitPrice = formatReceiptAmount(item.sellingPriceSnapshot, currencyCode);
        const lineTotal = formatReceiptAmount(item.lineTotal, currencyCode);

        lines.push(makeColumnLine(`   ${quantity} x ${unitPrice}`, lineTotal) + LF);

        const discountAmount = toMoney(item.discountAmount);

        if (discountAmount > 0) {
            lines.push(
                makeColumnLine(
                    '   Discount',
                    `-${formatReceiptAmount(discountAmount, currencyCode)}`,
                ) + LF,
            );
        }
    });

    lines.push(divider());
    lines.push(makeColumnLine('Items', String(itemCount)) + LF);
    lines.push(makeColumnLine('Subtotal', formatReceiptAmount(subtotal, currencyCode)) + LF);

    if (discountTotal > 0) {
        lines.push(
            makeColumnLine('Discount', `-${formatReceiptAmount(discountTotal, currencyCode)}`) + LF,
        );
    }

    lines.push(majorDivider());
    lines.push(setBold(true), setTextSize('double-height'));
    lines.push(makeColumnLine('TOTAL', formatReceiptAmount(total, currencyCode)) + LF);
    lines.push(setTextSize('normal'), setBold(false), majorDivider());
    lines.push(
        makeColumnLine('Paid', formatReceiptAmount(data.sale.paidAmount, currencyCode)) + LF,
    );
    lines.push(
        makeColumnLine(changeLabel, formatReceiptAmount(Math.abs(balance), currencyCode)) + LF,
    );

    const note = cleanText(data.sale.note);

    if (note) {
        lines.push(divider(), setBold(true), 'Note:' + LF, setBold(false));
        appendWrappedLines(lines, note);
    }

    const footer = cleanText(settings.receiptFooter ?? '');

    if (footer) {
        lines.push(divider(), setAlignment('center'));
        appendCenteredWrappedLines(lines, footer);
    }

    lines.push(
        divider(),
        setAlignment('center'),
        setBold(true),
        'THANK YOU FOR SHOPPING WITH US!' + LF,
        setBold(false),
        'Keep this receipt for returns.' + LF,
    );

    const barcodePrinted = appendBarcodeOrPlainText(lines, invoiceNumber, options.enableBarcode);

    lines.push(feed(options.feedLines));

    if (options.cutPaper) {
        lines.push(cutPaper());
    }

    return {
        receiptText: lines.join(''),
        barcodePrinted,
    };
}

export function buildEscPosReceipt(
    data: ReceiptPayload,
    options: Pick<ReceiptPrinterOptions, 'enableBarcode' | 'cutPaper' | 'feedLines'> = {},
) {
    const normalizedOptions = normalizeOptions(options);
    return buildReceiptText(data, normalizedOptions).receiptText;
}

async function getDefaultPrinter(qz: QzTrayApi) {
    if (!qz.printers.getDefault) return null;

    try {
        const defaultPrinter = (await qz.printers.getDefault()).trim();
        return defaultPrinter || null;
    } catch (error) {
        logWarn('Unable to read QZ default printer.', error);
        return null;
    }
}

export async function getAvailableReceiptPrinters(
    optionsOrPrinterName?: ReceiptPrinterOptions | string,
) {
    const qz = await getQzTray();
    const options = normalizeOptions(optionsOrPrinterName);

    await setupQzSecurity();
    await ensureQzConnected(qz, options);

    const printerList = await qz.printers.find();
    return normalizePrinterList(printerList);
}

function isReceiptLikePrinterName(printerName: string) {
    const name = printerName.toLowerCase();

    return (
        name.includes('pos') ||
        name.includes('receipt') ||
        name.includes('thermal') ||
        name.includes('80') ||
        name.includes('epson') ||
        name.includes('tm-') ||
        name.includes('xprinter') ||
        name.includes('xp-')
    );
}

function getPreferredPrinterMatch(printers: string[], preferredPrinterName: string) {
    const preferred = cleanInlineText(preferredPrinterName).toLowerCase();

    if (!preferred) return null;

    const exactMatch = printers.find((printer) => printer.toLowerCase() === preferred);

    if (exactMatch) return { printer: exactMatch, strategy: 'exact' };

    const containsMatch = printers.find((printer) => printer.toLowerCase().includes(preferred));

    if (containsMatch) return { printer: containsMatch, strategy: 'contains' };

    return null;
}

async function resolvePrinterName(qz: QzTrayApi, options: NormalizedReceiptPrinterOptions) {
    let printers: string[];

    try {
        printers = normalizePrinterList(await qz.printers.find());
    } catch (error) {
        logError('available printers failed', error);
        throw new ReceiptPrinterError(
            `Could not read printers from QZ Tray. Confirm QZ Tray is running and the POS printer is installed. ${getErrorMessage(
                error,
            )}`,
            error,
        );
    }

    logInfo('all available printers', printers);

    if (printers.length === 0) {
        throw new ReceiptPrinterError(
            'No printers were found through QZ Tray. Install the receipt printer driver, then restart QZ Tray.',
        );
    }

    const preferredMatch = getPreferredPrinterMatch(printers, options.printerName);

    if (preferredMatch) {
        logInfo('selected printer', preferredMatch);
        return preferredMatch.printer;
    }

    if (!options.allowPrinterFallback) {
        throw new ReceiptPrinterError(
            `Receipt printer '${options.printerName}' was not found. Available printers: ${printers.join(
                ', ',
            )}.`,
        );
    }

    const receiptLikePrinters = printers.filter(isReceiptLikePrinterName);

    if (receiptLikePrinters.length === 1) {
        logInfo('selected printer', {
            printer: receiptLikePrinters[0],
            strategy: 'only-receipt-like-name',
        });
        return receiptLikePrinters[0];
    }

    const defaultPrinter = await getDefaultPrinter(qz);

    if (
        defaultPrinter &&
        printers.includes(defaultPrinter) &&
        isReceiptLikePrinterName(defaultPrinter)
    ) {
        logInfo('selected printer', {
            printer: defaultPrinter,
            strategy: 'receipt-like-system-default',
        });
        return defaultPrinter;
    }

    if (printers.length === 1) {
        logInfo('selected printer', {
            printer: printers[0],
            strategy: 'only-printer',
        });
        return printers[0];
    }

    throw new ReceiptPrinterError(
        `Receipt printer '${options.printerName}' was not found and no safe fallback was available. Available printers: ${printers.join(
            ', ',
        )}. Set NEXT_PUBLIC_RECEIPT_PRINTER_NAME to the exact receipt printer name.`,
    );
}

async function getPrinterDetailsForLog(qz: QzTrayApi) {
    try {
        return await qz.printers.details();
    } catch (error) {
        return { error: getErrorMessage(error) };
    }
}

export async function logPrinterDetails() {
    const qz = await getQzTray();
    const options = normalizeOptions();

    await setupQzSecurity();
    await ensureQzConnected(qz, options);

    const [printers, details] = await Promise.all([
        qz.printers.find().then(normalizePrinterList),
        getPrinterDetailsForLog(qz),
    ]);

    logInfo('printer diagnostics', {
        qzScriptLoaded: true,
        securityConfigured: qzSecurityConfigured,
        websocketConnected: qz.websocket.isActive(),
        printers,
        details,
    });
}

function createQzConfigOptions(options: NormalizedReceiptPrinterOptions) {
    const configOptions: QzConfigOptions = {
        encoding: options.encoding,
        jobName: options.jobName,
    };

    if (options.forceRaw) {
        configOptions.forceRaw = true;
    }

    return configOptions;
}

async function qzPrintWithLogging(
    qz: QzTrayApi,
    config: QzTrayConfig,
    printData: QzPrintDataItem[],
    diagnostics: {
        mode: ReceiptPrintMode;
        printerName: string;
        configOptions: QzConfigOptions;
        rawCharacters: number;
        invoiceNumber?: string;
    },
) {
    logInfo('print config', {
        printer: diagnostics.printerName,
        ...diagnostics.configOptions,
    });
    logInfo('print-data mode', {
        mode: diagnostics.mode,
        itemCount: printData.length,
        rawCharacters: diagnostics.rawCharacters,
        invoiceNumber: diagnostics.invoiceNumber,
    });

    try {
        await qz.print(config, printData);
        logInfo('QZ print success', diagnostics);
    } catch (error) {
        logError('QZ print failure', {
            ...diagnostics,
            error: getErrorMessage(error),
        });
        throw error;
    }
}

async function prepareQzPrint(optionsOrPrinterName?: ReceiptPrinterOptions | string) {
    const options = normalizeOptions(optionsOrPrinterName);
    const qz = await getQzTray();

    await setupQzSecurity();
    await ensureQzConnected(qz, options);

    const printerName = await resolvePrinterName(qz, options);
    const configOptions = createQzConfigOptions(options);
    const config = qz.configs.create(printerName, configOptions);

    return {
        qz,
        options,
        printerName,
        config,
        configOptions,
    };
}

function buildRealReceiptPrintData(
    data: ReceiptPayload,
    options: NormalizedReceiptPrinterOptions,
    logoItems: QzPrintDataItem[],
) {
    const receipt = buildReceiptText(data, options);
    const hasLogo = logoItems.length > 0;
    const mode = getPrintMode(hasLogo, receipt.barcodePrinted);

    return {
        printData: [...logoItems, receipt.receiptText],
        receiptText: receipt.receiptText,
        mode,
        barcodePrinted: receipt.barcodePrinted,
    };
}

function enqueuePrint<T>(task: () => Promise<T>) {
    const queuedTask = printQueue.then(task, task);

    printQueue = queuedTask.then(
        () => undefined,
        () => undefined,
    );

    return queuedTask;
}

async function runTextOnlyFallback(
    data: ReceiptPayload,
    prepared: Awaited<ReturnType<typeof prepareQzPrint>>,
) {
    const textOnlyOptions: NormalizedReceiptPrinterOptions = {
        ...prepared.options,
        enableLogo: false,
        enableBarcode: false,
    };
    const textOnly = buildRealReceiptPrintData(data, textOnlyOptions, []);

    await qzPrintWithLogging(prepared.qz, prepared.config, textOnly.printData, {
        mode: 'text-only',
        printerName: prepared.printerName,
        configOptions: prepared.configOptions,
        rawCharacters: textOnly.receiptText.length,
        invoiceNumber: data.sale.invoiceNumber,
    });
}

export async function testPrintReceipt(optionsOrPrinterName?: ReceiptPrinterOptions | string) {
    return enqueuePrint(async () => {
        const prepared = await prepareQzPrint({
            ...normalizeOptions(optionsOrPrinterName),
            enableLogo: false,
            enableBarcode: false,
            jobName: 'QZ Test Receipt',
            cutPaper: true,
        });

        const now = new Date();
        const receiptText = [
            initPrinter(),
            setAlignment('center'),
            setTextSize('double-height'),
            setBold(true),
            'QZ TRAY TEST RECEIPT' + LF,
            setTextSize('normal'),
            setBold(false),
            divider(),
            setAlignment('left'),
            makeColumnLine('Printer', prepared.printerName) + LF,
            makeColumnLine('Date/Time', formatDateTime(now, 'dd/MM/yyyy hh:mm a')) + LF,
            makeColumnLine('Mode', 'TEXT ONLY RAW ESC/POS') + LF,
            makeColumnLine('Force raw', prepared.options.forceRaw ? 'YES' : 'NO') + LF,
            divider(),
            'If this text is clear, raw printing works.' + LF,
            'Logo and barcode are disabled for this test.' + LF,
            feed(prepared.options.feedLines),
            prepared.options.cutPaper ? cutPaper() : '',
        ].join('');

        await qzPrintWithLogging(prepared.qz, prepared.config, [receiptText], {
            mode: 'text-only',
            printerName: prepared.printerName,
            configOptions: prepared.configOptions,
            rawCharacters: receiptText.length,
        });
    });
}

export async function printReceiptEscPos(
    data: ReceiptPayload,
    optionsOrPrinterName?: ReceiptPrinterOptions | string,
) {
    return enqueuePrint(async () => {
        const prepared = await prepareQzPrint(optionsOrPrinterName);
        let logoItems: QzPrintDataItem[] = [];

        if (prepared.options.enableLogo) {
            try {
                logoItems = await buildLogoPrintItems(prepared.options);
            } catch (error) {
                logoItems = [];
                logWarn('Logo setup failed; printing receipt without logo.', error);
            }
        }

        const primary = buildRealReceiptPrintData(data, prepared.options, logoItems);

        try {
            await qzPrintWithLogging(prepared.qz, prepared.config, primary.printData, {
                mode: primary.mode,
                printerName: prepared.printerName,
                configOptions: prepared.configOptions,
                rawCharacters: primary.receiptText.length,
                invoiceNumber: data.sale.invoiceNumber,
            });
            return;
        } catch (primaryError) {
            if (logoItems.length > 0) {
                logWarn('Primary print failed with logo; retrying without logo.', primaryError);

                try {
                    const withoutLogo = buildRealReceiptPrintData(data, prepared.options, []);

                    await qzPrintWithLogging(prepared.qz, prepared.config, withoutLogo.printData, {
                        mode: getPrintMode(false, withoutLogo.barcodePrinted),
                        printerName: prepared.printerName,
                        configOptions: prepared.configOptions,
                        rawCharacters: withoutLogo.receiptText.length,
                        invoiceNumber: data.sale.invoiceNumber,
                    });
                    return;
                } catch (withoutLogoError) {
                    logWarn(
                        'Print failed after removing logo; retrying text-only.',
                        withoutLogoError,
                    );
                    await runTextOnlyFallback(data, prepared);
                    return;
                }
            }

            if (prepared.options.enableBarcode) {
                logWarn(
                    'Primary print failed with barcode enabled; retrying text-only.',
                    primaryError,
                );
                await runTextOnlyFallback(data, prepared);
                return;
            }

            throw new ReceiptPrinterError(
                `QZ Tray print failed. ${getErrorMessage(primaryError)}`,
                primaryError,
            );
        }
    });
}
