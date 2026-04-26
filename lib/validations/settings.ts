import { z } from "zod";

export const settingsSchema = z.object({
  shopName: z.string().min(2, "Shop name is required"),
  address: z.string().min(5, "Address is required"),
  phone: z.string().min(5, "Phone is required"),
  receiptHeader: z.string().optional(),
  receiptFooter: z.string().optional(),
  currencyCode: z.literal("LKR"),
  currencySymbol: z.literal("Rs."),
  receiptCopies: z.coerce.number().int().min(1).max(3),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
