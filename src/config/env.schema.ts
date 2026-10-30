import { z } from 'zod';

export const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
});

export type Env = z.infer<typeof envSchema>;
