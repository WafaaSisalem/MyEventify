import { z } from 'zod';

export const SignupSchema = z.strictObject({
  email: z.email(),
  password: z.string().min(12).max(128),
  name: z.string().min(1),
});
