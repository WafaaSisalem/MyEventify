import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.url(),
  PORT: z.coerce.number().default(3000),
  JWT_ACCESS_SECRET: z.string().min(1),
  WEB_ORIGIN: z.string().min(1),
});

export const config = envSchema.parse(process.env);
