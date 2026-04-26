import { Plus, Trash2 } from 'lucide-react';

import { ExpenseFormDialog } from '@/components/forms/expense-form-dialog';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { deleteExpenseAction } from '@/lib/actions/expense-actions';
import { requireRole } from '@/lib/auth/session';
import { listExpenses } from '@/lib/services/expenses';
import { getSettings } from '@/lib/services/settings';
import { formatCurrency, formatShortDate } from '@/lib/utils';

export default async function ExpensesPage({
    searchParams,
}: {
    searchParams: Promise<{ startDate?: string; endDate?: string; page?: string }>;
}) {
    await requireRole(['ADMIN']);
    const params = await searchParams;
    const [settings, data] = await Promise.all([
        getSettings(),
        listExpenses({
            startDate: params.startDate,
            endDate: params.endDate,
            page: Number(params.page ?? '1'),
        }),
    ]);

    return (
        <div className="space-y-2">
            <PageHeader
                title="Expenses"
                description="Track outgoing cash and keep profit reporting grounded in real shop costs."
                actions={
                    <ExpenseFormDialog
                        categories={data.categories}
                        trigger={
                            <Button>
                                <Plus className="h-4 w-4" />
                                Add expense
                            </Button>
                        }
                    />
                }
            />

            <Card>
                <CardContent className="space-y-4 p-6">
                    <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-sm text-slate-500">Filtered total</p>
                        <p className="text-2xl font-semibold text-slate-950">
                            {formatCurrency(data.totalAmount, settings.currencyCode)}
                        </p>
                    </div>
                    <form className="grid gap-3 md:grid-cols-3">
                        <Input name="startDate" type="date" defaultValue={params.startDate} />
                        <Input name="endDate" type="date" defaultValue={params.endDate} />
                        <Button type="submit" variant="secondary">
                            Filter
                        </Button>
                    </form>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.items.map((expense) => (
                                <TableRow key={expense.id}>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium">{expense.title}</p>
                                            <p className="text-xs text-slate-500">
                                                {expense.note ?? 'No note'}
                                            </p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {expense.category?.name ?? 'Uncategorized'}
                                    </TableCell>
                                    <TableCell>{formatShortDate(expense.expenseDate)}</TableCell>
                                    <TableCell>
                                        {formatCurrency(
                                            Number(expense.amount),
                                            settings.currencyCode,
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <ExpenseFormDialog
                                                expense={expense}
                                                categories={data.categories}
                                                trigger={<Button variant="outline">Edit</Button>}
                                            />
                                            <form
                                                action={async () => {
                                                    'use server';
                                                    await deleteExpenseAction(expense.id);
                                                }}
                                            >
                                                <Button variant="ghost" size="icon">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </form>
                                        </div>
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
