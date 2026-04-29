import { z } from "zod";

export const createPickupNoticeSchema = z.object({
  childId: z.string().min(1, "Child is required"),
  alternatePersonUserId: z.string().optional().nullable(),
  alternatePersonName: z.string().optional().nullable(),
  description: z.string().min(1, "Description is required").max(500),
}).refine(
  (data) => data.alternatePersonUserId || data.alternatePersonName,
  {
    message: "Either select a person or enter a name",
    path: ["alternatePersonUserId"],
  }
);

export const updatePickupNoticeSchema = z.object({
  alternatePersonUserId: z.string().optional().nullable(),
  alternatePersonName: z.string().optional().nullable(),
  description: z.string().min(1, "Description is required").max(500),
}).refine(
  (data) => data.alternatePersonUserId || data.alternatePersonName,
  {
    message: "Either select a person or enter a name",
    path: ["alternatePersonUserId"],
  }
);

export const acknowledgePickupNoticeSchema = z.object({
  notes: z.string().optional().nullable().default(null),
});

export type CreatePickupNoticeInput = z.infer<typeof createPickupNoticeSchema>;
export type UpdatePickupNoticeInput = z.infer<typeof updatePickupNoticeSchema>;
export type AcknowledgePickupNoticeInput = z.infer<typeof acknowledgePickupNoticeSchema>;
