import { z } from 'zod'

import {
  EMAIL_MAX_LENGTH,
  MAX_PHONE_NUMBER_LENGTH,
  NAME_LENGTH,
} from '@/constants'

export const formSchema = z.object({
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
  phone: z.string().max(MAX_PHONE_NUMBER_LENGTH, {
    message: `Phone number must be at most ${MAX_PHONE_NUMBER_LENGTH} characters long.`,
  }),
  country: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  add1: z.string().optional().nullable(),
  add2: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  otherIndustry: z.string().optional().nullable(),
})

export const formEmailSchema = z.object({
  secondaryEmail: z
    .string({
      required_error: 'Please select an email to display.',
    })
    .email()
    .max(EMAIL_MAX_LENGTH, {
      message: `Email must be no more than ${EMAIL_MAX_LENGTH} characters long.`,
    }),
  defaultEmail: z.boolean().default(false),
})
