import B2C from '@/components/b2c'
import B2B from '@/components/remote-legal-custom-format'

//Add components for different organizations here
const orderComponents: {
  [key: string]: React.ComponentType<{ invoiceId: string }>
} = {
  TRANSCRIPTION: B2C,
  TRANSCRIPTION_FORMATTING: B2B,
}

export const getOrderComponent = (orderType: string) =>
  orderComponents[orderType] || B2C
