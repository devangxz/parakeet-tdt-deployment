import { customAlphabet } from 'nanoid'

export const generateUniqueId = () => {
  const alphabet =
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
  const generate = customAlphabet(alphabet, 12)
  return generate()
}