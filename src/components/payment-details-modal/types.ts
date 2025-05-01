export interface ReceiptInterface {
  services: string
  paidByName: string
  paidByEmail: string
  chargeAmount: number
  refundedAmount: number
  netAmount: number
  transactionId: string
  date: string
  invoiceType: string
  discount?: number
  creditsUsed?: number
  paymentMethod?: string
}

export interface File {
  filename: string
  delivery_date: string
  duration: string
  rate: string
  amount: string
}

interface Template {
  id: number
  name: string
}

export interface ServicesInterface {
  orderOptions: string
  speakerNameFormat: string
  transcriptTemplate: string
  spellingStyle: string
  specialInstructions: string
  templates: Template[]
}

export interface BillSummary {
  total: number
  files: File[]
}
