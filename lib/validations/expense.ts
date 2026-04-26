import { z } from "zod";

export const expenseSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(2, "Expense title is required"),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  categoryId: z.string().optional().nullable(),
  note: z.string().optional(),
  expenseDate: z.string().min(1, "Expense date is required"),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;

