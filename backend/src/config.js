import { z } from 'zod';

const configSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  PORT: z.coerce
    .number()
    .int()
    .positive()
    .default(3000),

  DATABASE_URL: z
    .string()
    .default(
      'postgres://app:app_password@localhost:5432/reservations'
    ),

  CORS_ORIGIN: z
    .string()
    .default('http://localhost:5173'),

  LOG_LEVEL: z
    .string()
    .default('info')
});

export const config =
  configSchema.parse(process.env);