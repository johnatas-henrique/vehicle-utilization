import { z } from 'zod';

export const createDriverSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export const updateDriverSchema = createDriverSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export const driverQuerySchema = z.object({
  name: z.string().trim().optional(),
});

export type CreateDriverInput = z.infer<typeof createDriverSchema>;
export type UpdateDriverInput = z.infer<typeof updateDriverSchema>;
export type DriverQuery = z.infer<typeof driverQuerySchema>;
