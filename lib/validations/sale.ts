import { z } from "zod";

export const saleItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
  discountAmount: z.coerce.number().min(0).default(0),
});

export const saleSchema = z.object({
  items: z.array(saleItemSchema).min(1, "Add at least one product"),
  cartDiscount: z.coerce.number().min(0).default(0),
  paidAmount: z.coerce.number().min(0, "Paid amount is required"),
  paymentMethod: z.enum(["CASH", "CARD"]),
  note: z.string().optional(),
});

export type SaleInput = z.infer<typeof saleSchema>;

