import { z } from 'zod'

export const formSchema = z.object({
  source: z.string({
    required_error: 'Please select source',
  }),
})
