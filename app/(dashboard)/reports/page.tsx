import Link from 'next/link';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';

import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { REPORT_TYPES } from '@/lib/constants';
import { requireRole } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { getReportData } from '@/lib/services/reports';
import { getSettings } from '@/lib/services/settings';
import { formatCurrency, formatShortDate } from '@/lib/utils';

export default async function ReportsPage({
    searchParams,
}: {
    searchParams: Promise<{
        type?: (typeof REPORT_TYPES)[number];
        startDate?: string;
        endDate?: string;
        cashierId?: string;
    }>;
}) {
    await requireRole(['ADMIN']);
    const params = await searchParams;
    const today = new Date().toISOString().slice(0, 10);
    const startDate = params.startDate ?? today;
    const endDate = params.endDate ?? today;
    const type = params.type ?? 'daily-sales';

    const [settings, data, cashiers] = await Promise.all([
        getSettings(),
        getReportData({
            type,
            startDate,
            endDate,
            cashierId: params.cashierId,
        }),
        prisma.user.findMany({
            where: { role: 'CASHIER', isActive: true },
            orderBy: { fullName: 'asc' },
        }),
    ]);

    const exportBase = `/api/reports/export?type=${type}&startDate=${startDate}&endDate=${endDate}${params.cashierId ? `&cashierId=${params.cashierId}` : ''}`;

    return (
        <div className="space-y-2">
            <PageHeader
                title="Reports"
                description="Filter core retail metrics and export the current report to PDF or Excel."
                actions={
                    <div className="flex items-center justify-start gap-2">
                        <Button asChild variant="secondary">
                            <Link href={`${exportBase}&format=pdf`}>
                                <FileText className="h-4 w-4" />
                                Export PDF
                            </Link>
                        </Button>
                        <Button asChild>
                            <Link href={`${exportBase}&format=xlsx`}>
                                <FileSpreadsheet className="h-4 w-4" />
                                Export Excel
                            </Link>
                        </Button>
                    </div>
                }
            />

            <Card>
                <CardContent className="space-y-6 p-6">
                    <form className="grid gap-3 lg:grid-cols-[220px_180px_180px_220px_auto]">
                        <Input name="type" defaultValue={type} placeholder="Report type" />
                        <Input name="startDate" type="date" defaultValue={startDate} />
                        <Input name="endDate" type="date" defaultValue={endDate} />
                        <Input
                            name="cashierId"
                            defaultValue={params.cashierId}
                            placeholder="Cashier ID (optional)"
                        />
                        <Button type="submit" variant="secondary">
                            <Download className="h-4 w-4" />
                            Apply
                        </Button>
                    </form>
                    <div className="flex flex-wrap gap-2">
                        {REPORT_TYPES.map((reportType) => (
                            <Badge
                                key={reportType}
                                variant={reportType === type ? 'default' : 'secondary'}
                            >
                                {reportType}
                            </Badge>
                        ))}
                    </div>
                    <div className="grid gap-2 md:grid-cols-4">
                        <Card>
                            <CardContent className="p-5">
                                <p className="text-sm text-slate-500">Sales</p>
                                <p className="text-2xl font-semibold">
                                    {formatCurrency(data.summary.salesTotal, settings.currencyCode)}
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-5">
                                <p className="text-sm text-slate-500">Returns</p>
                                <p className="text-2xl font-semibold">
                                    {formatCurrency(
                                        data.summary.returnTotal,
                                        settings.currencyCode,
                                    )}
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-5">
                                <p className="text-sm text-slate-500">Expenses</p>
                                <p className="text-2xl font-semibold">
                                    {formatCurrency(
                                        data.summary.expenseTotal,
                                        settings.currencyCode,
                                    )}
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-5">
                                <p className="text-sm text-slate-500">Profit</p>
                                <p className="text-2xl font-semibold">
                                    {formatCurrency(
                                        data.summary.profitTotal,
                                        settings.currencyCode,
                                    )}
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-2 xl:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Sales</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Invoice</TableHead>
                                    <TableHead>Cashier</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.sales.slice(0, 12).map((sale) => (
                                    <TableRow key={sale.id}>
                                        <TableCell>{sale.invoiceNumber}</TableCell>
                                        <TableCell>{sale.cashier.fullName}</TableCell>
                                        <TableCell>{formatShortDate(sale.createdAt)}</TableCell>
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

                <Card>
                    <CardHeader>
                        <CardTitle>Best Sellers</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Quantity</TableHead>
                                    <TableHead className="text-right">Sales Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.bestSellingProducts.slice(0, 12).map((item) => (
                                    <TableRow key={item.productName}>
                                        <TableCell>{item.productName}</TableCell>
                                        <TableCell>{item.quantity}</TableCell>
                                        <TableCell className="text-right">
                                            {formatCurrency(item.salesTotal, settings.currencyCode)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Cashier Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Cashier</TableHead>
                                    <TableHead>Sales</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.cashierSummary.map((item) => (
                                    <TableRow key={item.cashierId}>
                                        <TableCell>{item.cashierName}</TableCell>
                                        <TableCell>{item.saleCount}</TableCell>
                                        <TableCell className="text-right">
                                            {formatCurrency(item.totalSales, settings.currencyCode)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Expense Report</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.expenses.slice(0, 12).map((expense) => (
                                    <TableRow key={expense.id}>
                                        <TableCell>{expense.title}</TableCell>
                                        <TableCell>
                                            {expense.category?.name ?? 'Uncategorized'}
                                        </TableCell>
                                        <TableCell>
                                            {formatShortDate(expense.expenseDate)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {formatCurrency(
                                                Number(expense.amount),
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

            <Card>
                <CardHeader>
                    <CardTitle>Available Cashiers</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                    {cashiers.map((cashier) => (
                        <Badge key={cashier.id} variant="secondary">
                            {cashier.fullName}
                        </Badge>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
