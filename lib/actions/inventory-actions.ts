"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/actions/types";
import { createStockAdjustment } from "@/lib/services/inventory";

export async function createStockAdjustmentAction(input: {
  productId: string;
  quantityChange: number;
  note: string;
}): Promise<ActionResult> {
  const session = await requireRole(["ADMIN"]);

  try {
    await createStockAdjustment({
      ...input,
      createdById: session.id,
    });

    revalidatePath("/inventory");
    revalidatePath("/products");
    revalidatePath("/pos");

    return {
      success: true,
      message: "Stock adjusted",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to adjust stock",
    };
  }
}

