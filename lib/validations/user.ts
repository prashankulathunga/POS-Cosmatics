import { z } from "zod";

export const userSchema = z.object({
  id: z.string().optional(),
  username: z.string().min(3, "Username is required"),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  fullName: z.string().min(2, "Full name is required"),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
  role: z.enum(["ADMIN", "CASHIER"]),
  isActive: z.boolean().default(true),
});

export type UserInput = z.infer<typeof userSchema>;

