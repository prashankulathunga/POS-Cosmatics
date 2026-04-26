"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/actions/types";
import { deactivateUser, saveUser } from "@/lib/services/users";
import type { UserInput } from "@/lib/validations/user";

export async function saveUserAction(input: UserInput): Promise<ActionResult> {
  await requireRole(["ADMIN"]);

  try {
    await saveUser(input);
    revalidatePath("/users");

    return {
      success: true,
      message: input.id ? "User updated" : "User created",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to save user",
    };
  }
}

export async function deactivateUserAction(userId: string): Promise<ActionResult> {
  await requireRole(["ADMIN"]);

  try {
    await deactivateUser(userId);
    revalidatePath("/users");

    return {
      success: true,
      message: "User deactivated",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to deactivate user",
    };
  }
}

