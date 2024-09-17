export interface File {
  id: string
  filename: string
  date: string
  duration: number
}

export interface BaseTranscriberFile {
  index: number
  orderId: number
  fileId: string
  filename: string
  orderTs: string
  pwer: number
  status: string
  priority: number
  duration: number
  qc: string
  deliveryTs: string
  hd: boolean
  orderType: string
  rateBonus: number
  timeString: string
  dateString: string
  diff: string
  rate: number
  instructions: string | null
}

export interface User {
  firstName: string
  lastName: string
  email: string
}

export interface FileCost {
  transcriptionRate: number
  transcriptionCost: number
  customFormatRate: number
  customFormatCost: number
}
