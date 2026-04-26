import { PageHeader } from '@/components/shared/page-header';
import { PosTerminal } from '@/components/pos/pos-terminal';
import { requireRole } from '@/lib/auth/session';
import { getProductOptions } from '@/lib/services/products';
import { listRecentSalesForPos } from '@/lib/services/sales';
import { getSettings } from '@/lib/services/settings';

export default async function PosPage() {
    await requireRole(['ADMIN', 'CASHIER']);

    const [products, recentSales, settings] = await Promise.all([
        getProductOptions(undefined, 24),
        listRecentSalesForPos(6),
        getSettings(),
    ]);

    return (
        <div className="space-y-2">
            <PageHeader
                title="Sales / POS"
                description="Fast cashier mode with barcode scanning, instant cart updates, and receipt reprinting."
            />
            <PosTerminal initialProducts={products} recentSales={recentSales} settings={settings} />
        </div>
    );
}
