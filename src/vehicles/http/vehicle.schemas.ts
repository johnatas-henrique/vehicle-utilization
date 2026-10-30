import { z } from 'zod';

export const createVehicleSchema = z.object({
  plate: z
    .string()
    .trim()
    .min(1)
    .max(16)
    .transform((value) => value.toUpperCase()),
  color: z.string().trim().min(1).max(40),
  brand: z.string().trim().min(1).max(40),
});

export const updateVehicleSchema = createVehicleSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export const vehicleQuerySchema = z.object({
  color: z.string().trim().optional(),
  brand: z.string().trim().optional(),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
export type VehicleQuery = z.infer<typeof vehicleQuerySchema>;
