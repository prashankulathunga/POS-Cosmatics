import { z } from "zod";

export const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Product name is required"),
  barcode: z
    .string()
    .min(6, "Barcode must be at least 6 characters")
    .optional()
    .or(z.literal("")),
  categoryId: z.string().optional().nullable(),
  buyingPrice: z.coerce.number().min(0, "Buying price must be positive"),
  sellingPrice: z.coerce.number().min(0.01, "Selling price must be greater than zero"),
  stockQuantity: z.coerce.number().int().min(0, "Stock quantity cannot be negative"),
  lowStockLimit: z.coerce.number().int().min(0, "Low stock limit cannot be negative"),
  isActive: z.boolean().default(true),
});

export type ProductInput = z.infer<typeof productSchema>;
