import { z } from 'zod';

export const createUsageSchema = z.object({
  vehicleId: z.string().trim().min(1),
  driverId: z.string().trim().min(1),
  reason: z.string().trim().min(1).max(200),
  startedAt: z.iso.datetime({ offset: true }).optional(),
});

export type CreateUsageInput = z.infer<typeof createUsageSchema>;
