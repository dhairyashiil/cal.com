import { z } from "zod";

export const ZAddPendingHostInputSchema = z.object({
  eventTypeId: z.number(),
  email: z.string().email(),
  isFixed: z.boolean().default(false),
  priority: z.number().min(0).max(4).default(2),
  weight: z.number().min(0).default(100),
  groupId: z.string().nullable().default(null),
});

export type TAddPendingHostInputSchema = z.infer<typeof ZAddPendingHostInputSchema>;

export const ZRemovePendingHostInputSchema = z.object({
  eventTypeId: z.number(),
  email: z.string().email(),
});

export type TRemovePendingHostInputSchema = z.infer<typeof ZRemovePendingHostInputSchema>;

export const ZListPendingHostsInputSchema = z.object({
  eventTypeId: z.number(),
});

export type TListPendingHostsInputSchema = z.infer<typeof ZListPendingHostsInputSchema>;
