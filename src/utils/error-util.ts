import errorMessages from '../../messages/errors/settings/order-options.json'

interface ErrorMessages {
  [key: string]: string
}

export function mapKeyToMessage(key: string): string | undefined {
  return (errorMessages as ErrorMessages)[key]
}
