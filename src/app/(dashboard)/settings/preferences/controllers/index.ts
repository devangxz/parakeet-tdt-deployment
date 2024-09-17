import { z } from 'zod'

import {
  EMAIL_MAX_LENGTH,
  MAX_PHONE_NUMBER_LENGTH,
  NAME_LENGTH,
  USER_TYPES,
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
    firstName: z
      .string()
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
    phone: z.string().max(MAX_PHONE_NUMBER_LENGTH, {
      message: `Phone number must be at most ${MAX_PHONE_NUMBER_LENGTH} characters long.`,
    }),
    defaultEmail: z.boolean().default(false),
    country: z.string().optional(),
    city: z.string().optional(),
    add1: z.string().optional(),
    add2: z.string().optional(),
    postalCode: z.string().optional(),
    userType: z.enum(USER_TYPES as [string, ...string[]], {
      required_error: 'You need to select user type to proceed.',
    }),
    industry: z.string().optional(),
    otherIndustry: z.string(),
  })