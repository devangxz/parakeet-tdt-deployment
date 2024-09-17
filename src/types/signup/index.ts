import { INDUSTRIES, USER_TYPES } from "@/constants"

export interface FormState {
  firstName: string
  lastName: string
  email: string
  countryCode: string
  phone: string
  password: string
  confirmPassword: string
  userType: (typeof USER_TYPES)[number]
  industry: (typeof INDUSTRIES)[number]
  terms: boolean
  receive_updates: boolean
}
