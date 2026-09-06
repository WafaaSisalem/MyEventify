import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.url(),
  PORT: z.coerce.number().default(3000),
  JWT_ACCESS_SECRET: z.string().min(1),
  WEB_ORIGIN: z.url(),
  REDIS_URL: z.url(),
  ETHEREAL_USER: z.string().min(1),
  ETHEREAL_PASS: z.string().min(1),
});

export const config = envSchema.parse(process.env);
