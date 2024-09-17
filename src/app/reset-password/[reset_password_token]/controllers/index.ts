import { z } from 'zod'

import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '@/constants'

export const formSchema = z.object({
  password: z
      .string()
      .min(MIN_PASSWORD_LENGTH, {
        message: `Password should have at least ${MIN_PASSWORD_LENGTH} characters length`,
      })
      .max(MAX_PASSWORD_LENGTH, {
        message: `Password must be no more than ${MAX_PASSWORD_LENGTH} characters long.`,
      })
      .regex(/[a-z]/, {
        message: 'Password should have at least one lower case letter',
      })
      .regex(/[A-Z]/, {
        message: 'Password should have at least one upper case letter',
      })
      .regex(/\d/, { message: 'Password should have at least one number' })
      .regex(/[^a-zA-Z0-9]/, {
        message: 'Password should have at least one special character',
      })
      .nonempty({ message: 'Password should not be empty' }),
  rememberPassword: z.boolean(),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords must match.",
  path: ["confirmPassword"],
});
