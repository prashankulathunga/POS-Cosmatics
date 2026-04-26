"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/actions/types";
import { processReturn } from "@/lib/services/returns";
import type { ReturnInput } from "@/lib/validations/return";

export async function processReturnAction(input: ReturnInput): Promise<ActionResult> {
  const session = await requireRole(["ADMIN", "CASHIER"]);

  try {
    await processReturn(input, session.id);
    revalidatePath("/dashboard");
    revalidatePath("/returns");
    revalidatePath("/inventory");
    revalidatePath("/reports");

    return {
      success: true,
      message: "Return saved",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to process return",
    };
  }
}
