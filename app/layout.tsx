import type { Metadata } from 'next';
import Script from 'next/script';

import { AppProviders } from '@/components/layout/app-providers';
import './globals.css';

export const metadata: Metadata = {
    title: 'BLISSORA',
    description: 'Retail POS system for products, stock, sales, returns, expenses, and reports.',
};

const qzTrayScriptSrc =
    process.env.NEXT_PUBLIC_QZ_TRAY_SCRIPT_SRC ??
    'https://cdn.jsdelivr.net/npm/qz-tray@2.2.6/qz-tray.js';

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className="min-h-screen bg-background font-sans text-slate-900 antialiased">
                <Script
                    id="qz-tray"
                    src={qzTrayScriptSrc}
                    strategy="afterInteractive"
                    crossOrigin="anonymous"
                />
                <AppProviders>{children}</AppProviders>
            </body>
        </html>
    );
}
