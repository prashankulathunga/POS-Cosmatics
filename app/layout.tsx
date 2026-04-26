import type { Metadata } from 'next';

import { AppProviders } from '@/components/layout/app-providers';
import './globals.css';

export const metadata: Metadata = {
    title: 'BLISSORA',
    description: 'Retail POS system for products, stock, sales, returns, expenses, and reports.',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" data-scroll-behavior="smooth">
            <body className="min-h-screen bg-background font-sans text-slate-900 antialiased">
                <AppProviders>{children}</AppProviders>
            </body>
        </html>
    );
}
