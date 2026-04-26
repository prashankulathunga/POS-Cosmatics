import { z } from "zod";

export const returnItemSchema = z.object({
  saleItemId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
});

export const returnSchema = z.object({
  saleId: z.string().min(1),
  reason: z.string().optional(),
  items: z.array(returnItemSchema).min(1, "Select at least one item"),
});

export type ReturnInput = z.infer<typeof returnSchema>;

