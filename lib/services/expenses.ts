import "server-only";

import { Prisma } from "@prisma/client";

import { PAGE_SIZE } from "@/lib/constants";
import { prisma } from "@/lib/db/prisma";
import type { ExpenseDialogCategory, ExpenseDialogExpense } from "@/lib/types";
import { expenseSchema, type ExpenseInput } from "@/lib/validations/expense";

type ListExpensesOptions = {
  page?: number;
  startDate?: string;
  endDate?: string;
};

export async function listExpenses(options: ListExpensesOptions = {}) {
  const page = Math.max(options.page ?? 1, 1);

  const where: Prisma.ExpenseWhereInput = {
    ...(options.startDate || options.endDate
      ? {
          expenseDate: {
            ...(options.startDate ? { gte: new Date(options.startDate) } : {}),
            ...(options.endDate ? { lte: new Date(options.endDate) } : {}),
          },
        }
      : {}),
  };

  const [items, totalCount, summary, categories] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: {
        category: true,
        createdBy: true,
      },
      orderBy: { expenseDate: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.expense.count({ where }),
    prisma.expense.aggregate({
      where,
      _sum: {
        amount: true,
      },
    }),
    prisma.expenseCategory.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    items: items.map<ExpenseDialogExpense & { category: { name: string } | null; createdBy: { fullName: string } | null }>(
      (item) => ({
        id: item.id,
        title: item.title,
        amount: Number(item.amount),
        note: item.note,
        expenseDate: item.expenseDate.toISOString(),
        categoryId: item.categoryId,
        category: item.category ? { name: item.category.name } : null,
        createdBy: item.createdBy ? { fullName: item.createdBy.fullName } : null,
      }),
    ),
    categories: categories.map<ExpenseDialogCategory>((category) => ({
      id: category.id,
      name: category.name,
    })),
    page,
    totalCount,
    totalPages: Math.max(Math.ceil(totalCount / PAGE_SIZE), 1),
    totalAmount: Number(summary._sum.amount ?? 0),
  };
}

export async function saveExpense(input: ExpenseInput, userId: string) {
  const values = expenseSchema.parse(input);

  const data = {
    title: values.title,
    amount: new Prisma.Decimal(values.amount.toFixed(2)),
    categoryId: values.categoryId || null,
    note: values.note || null,
    expenseDate: new Date(values.expenseDate),
    createdById: userId,
  };

  if (values.id) {
    return prisma.expense.update({
      where: { id: values.id },
      data,
    });
  }

  return prisma.expense.create({ data });
}

export async function deleteExpense(expenseId: string) {
  return prisma.expense.delete({
    where: { id: expenseId },
  });
}
