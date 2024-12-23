import { z } from 'zod'

import {
  EMAIL_MAX_LENGTH,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  NAME_LENGTH,
} from '@/constants'

export const formSchema = z
  .object({
    email: z
      .string({
        required_error: 'Please select an email to display.',
      })
      .email()
      .max(EMAIL_MAX_LENGTH, {
        message: `Email must be no more than ${EMAIL_MAX_LENGTH} characters long.`,
      }),
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
    confirmPassword: z.string(),
    firstName: z
      .string()
      .nonempty({ message: 'First name is required.' })
      .max(NAME_LENGTH, {
        message: `First name must be at most ${NAME_LENGTH} characters long.`,
      })
      .regex(/^[a-zA-Z0-9_ ]*$/, {
        message:
          'First name can only contain alphanumeric characters, underscores, and spaces.',
      }),
    lastName: z
      .string()
      .nonempty({ message: 'Last name is required.' })
      .max(NAME_LENGTH, {
        message: `Last name must be at most ${NAME_LENGTH} characters long.`,
      })
      .regex(/^[a-zA-Z0-9_ ]*$/, {
        message:
          'Last name can only contain alphanumeric characters, underscores, and spaces.',
      }),
    terms: z.boolean().refine((val) => val === true, {
      message: 'You must accept the terms and conditions.',
    }),
    receive_updates: z.boolean().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords must match.',
    path: ['confirmPassword'],
  })
