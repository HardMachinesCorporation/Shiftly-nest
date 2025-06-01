import { z } from 'zod';
import * as dotenv from 'dotenv';

dotenv.config();

export const bcryptSchema = z.object({
  SALT_ROUND: z
    .string()
    .trim()
    .transform((val) => parseInt(val, 10))
    .refine((num) => !isNaN(num), { message: 'SALT_ROUND must be a number' })
    .refine((num) => num > 10 && num <= 20, {
      message: 'SALT_ROUND must be a number between 11 and 20',
    }),
});

export type BcryptType = z.infer<typeof bcryptSchema>;
