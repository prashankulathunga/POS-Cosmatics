"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/actions/types";
import { saveSettings } from "@/lib/services/settings";
import type { SettingsInput } from "@/lib/validations/settings";

export async function saveSettingsAction(input: SettingsInput): Promise<ActionResult> {
  await requireRole(["ADMIN"]);

  try {
    await saveSettings(input);
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    revalidatePath("/pos");

    return {
      success: true,
      message: "Settings updated",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to save settings",
    };
  }
}

