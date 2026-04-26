"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/actions/types";
import { deleteExpense, saveExpense } from "@/lib/services/expenses";
import type { ExpenseInput } from "@/lib/validations/expense";

export async function saveExpenseAction(input: ExpenseInput): Promise<ActionResult> {
  const session = await requireRole(["ADMIN"]);

  try {
    await saveExpense(input, session.id);
    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    revalidatePath("/reports");

    return {
      success: true,
      message: input.id ? "Expense updated" : "Expense created",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to save expense",
    };
  }
}

export async function deleteExpenseAction(expenseId: string): Promise<ActionResult> {
  await requireRole(["ADMIN"]);

  try {
    await deleteExpense(expenseId);
    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    revalidatePath("/reports");

    return {
      success: true,
      message: "Expense deleted",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to delete expense",
    };
  }
}

