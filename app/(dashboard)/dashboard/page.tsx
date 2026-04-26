import { SalesChart } from '@/components/dashboard/sales-chart';
import { StatCard } from '@/components/dashboard/stat-card';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { requireSession } from '@/lib/auth/session';
import { getDashboardData } from '@/lib/services/dashboard';
import { getSettings } from '@/lib/services/settings';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export default async function DashboardPage() {
    const session = await requireSession();
    const [data, settings] = await Promise.all([
        getDashboardData(session.role, session.id),
        getSettings(),
    ]);


    return (
        <div className="space-y-2">
            <PageHeader
                title="Sales Performance Dashboard"
                description="Keep an eye on sales, stock pressure, returns, and expenses from one place."
            />

            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    title="Today's Sales"
                    value={formatCurrency(data.todaySales, settings.currencyCode)}
                    subtitle={`${data.todaySalesCount} completed sales`}
                />
                <StatCard
                    title="Products"
                    value={data.productsCount.toString()}
                    subtitle={`${data.lowStockItems.length} low-stock items highlighted`}
                />
                <StatCard
                    title="Today's Expenses"
                    value={formatCurrency(data.todayExpenses, settings.currencyCode)}
                    subtitle="Operational spending tracked today"
                />
                <StatCard
                    title="Recent Returns"
                    value={data.recentReturns.length.toString()}
                    subtitle="Most recent refund records"
                />
            </div>

            <div className="grid gap-2 xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,1fr)]">
                <SalesChart data={data.chartData} currencyCode={settings.currencyCode} />

                <Card className='px-2'>
                    <CardHeader>
                        <CardTitle>Low Stock Alerts</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {data.lowStockItems.length === 0 ? (
                            <p className="text-sm text-slate-500">
                                All active products are above their alert thresholds.
                            </p>
                        ) : (
                            data.lowStockItems.map((product) => (
                                <div
                                    key={product.id}
                                    className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 p-4"
                                >
                                    <div className='space-y-1'>
                                        <p className="text-sm text-slate-400">BN : {product.barcode}</p>
                                        <p className="font-medium text-slate-700">{product.name}</p>
                                    </div>
                                    <Badge variant="warning">{product.stockQuantity} left</Badge>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-2 xl:grid-cols-2">
                <Card className='bg-[linear-gradient(245deg,#ffffff,#fbd8da10)]'>
                    <CardHeader>
                        <CardTitle>Recent Transactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Invoice</TableHead>
                                    <TableHead>Cashier</TableHead>
                                    <TableHead>Time</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.recentTransactions.map((sale) => (
                                    <TableRow key={sale.id}>
                                        <TableCell className="font-medium">
                                            {sale.invoiceNumber}
                                        </TableCell>
                                        <TableCell>{sale.cashier.fullName}</TableCell>
                                        <TableCell>{formatDateTime(sale.createdAt)}</TableCell>
                                        <TableCell className="text-right">
                                            {formatCurrency(
                                                Number(sale.total),
                                                settings.currencyCode,
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card className='bg-[linear-gradient(135deg,#ffffff,#fbd8da10)]'>
                    <CardHeader>
                        <CardTitle>Recent Returns</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Return No.</TableHead>
                                    <TableHead>Invoice</TableHead>
                                    <TableHead>Time</TableHead>
                                    <TableHead className="text-right">Refund</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.recentReturns.map((entry) => (
                                    <TableRow key={entry.id}>
                                        <TableCell className="font-medium">
                                            {entry.returnNumber}
                                        </TableCell>
                                        <TableCell>{entry.sale.invoiceNumber}</TableCell>
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
        </div>
    );
}
