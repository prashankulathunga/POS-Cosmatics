import { z } from "zod";

import { REPORT_TYPES } from "@/lib/constants";

export const reportFilterSchema = z.object({
  type: z.enum(REPORT_TYPES),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  cashierId: z.string().optional(),
});

export type ReportFilterInput = z.infer<typeof reportFilterSchema>;
