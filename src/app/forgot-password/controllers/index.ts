import { z } from 'zod'

import { EMAIL_MAX_LENGTH } from '@/constants'

export const formSchema = z.object({
  email: z
    .string({
      required_error: 'Please select an email to display.',
    })
    .email()
    .max(EMAIL_MAX_LENGTH, {
      message: `Email must be no more than ${EMAIL_MAX_LENGTH} characters long.`,
    }),
})
