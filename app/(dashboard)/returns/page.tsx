import { PageHeader } from '@/components/shared/page-header';
import { ReturnsManager } from '@/components/returns/returns-manager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { requireRole } from '@/lib/auth/session';
import { listReturns } from '@/lib/services/returns';
import { getSettings } from '@/lib/services/settings';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export default async function ReturnsPage({
    searchParams,
}: {
    searchParams: Promise<{ query?: string }>;
}) {
    await requireRole(['ADMIN', 'CASHIER']);
    const params = await searchParams;
    const [settings, returns] = await Promise.all([getSettings(), listReturns(params.query)]);

    return (
        <div className="space-y-2">
            <PageHeader
                title="Returns"
                description="Find past invoices, process partial returns, and restore stock safely."
            />

            <ReturnsManager currencyCode={settings.currencyCode} />

            <Card>
                <CardHeader>
                    <CardTitle>Return History</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Return</TableHead>
                                <TableHead>Invoice</TableHead>
                                <TableHead>Cashier</TableHead>
                                <TableHead>Time</TableHead>
                                <TableHead className="text-right">Refund</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {returns.map((entry) => (
                                <TableRow key={entry.id}>
                                    <TableCell>{entry.returnNumber}</TableCell>
                                    <TableCell>{entry.sale.invoiceNumber}</TableCell>
                                    <TableCell>{entry.cashier.fullName}</TableCell>
                                    <TableCell>{formatDateTime(entry.createdAt)}</TableCell>
                                    <TableCell className="text-right">
                                        {formatCurrency(
                                            Number(entry.refundAmount),
                                            settings.currencyCode,
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
