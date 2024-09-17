import { z } from 'zod'

export const formSchema = z.object({
  email: z
    .string({
      required_error: 'Please select an email to display.',
    })
    .email(),
  password: z.string().nonempty({ message: 'Password should not be empty' }),
  rememberPassword: z.boolean(),
})
