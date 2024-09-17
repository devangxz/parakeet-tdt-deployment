import { z } from 'zod'

import {
  EMAIL_MAX_LENGTH,
  MAX_PHONE_NUMBER_LENGTH,
  NAME_LENGTH,
} from '@/constants'

export const formSchema = z.object({
  name: z
    .string()
    .nonempty({ message: 'First name is required.' })
    .max(NAME_LENGTH, {
      message: `First name must be at most ${NAME_LENGTH} characters long.`,
    })
    .regex(/^[a-zA-Z0-9_ ]*$/, {
      message:
        'First name can only contain alphanumeric characters, underscores, and spaces.',
    }),
  userEmail: z
    .string({
      required_error: 'Please select an email to display.',
    })
    .email()
    .max(EMAIL_MAX_LENGTH, {
      message: `Email must be no more than ${EMAIL_MAX_LENGTH} characters long.`,
    }),
  phone: z.string().max(MAX_PHONE_NUMBER_LENGTH, {
    message: `Phone number must be at most ${MAX_PHONE_NUMBER_LENGTH} characters long.`,
  }),
  demoDate: z.date().refine((date) => date.toISOString(), {
    message: 'Demo date is required.',
  }),
  duration: z.number().min(1, {
    message: 'Duration must be at least 1 minute.',
  }),
  onetimeorder: z.boolean({
    required_error: 'You need to select order type to proceed.',
  }),
})
