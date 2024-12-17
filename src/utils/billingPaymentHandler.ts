import { Dispatch, SetStateAction } from 'react'
import { toast } from 'sonner'

import { checkoutViaBilling } from '@/app/actions/payment/checkout-via-billing'

interface PaymentSuccessData {
  transactionId: string
  paymentMethod: string
  pp_account?: string
  cc_last4?: string
  amount: number
}

export const handleBillingPaymentMethod = async (
  orderType: 'TRANSCRIPTION' | 'TRANSCRIPTION_FORMATTING',
  invoiceId: string,
  setPaymentSuccessData: Dispatch<SetStateAction<PaymentSuccessData | null>>,
  setPaymentSuccess: Dispatch<SetStateAction<boolean>>,
  setLoadingPay: Dispatch<SetStateAction<boolean>>
) => {
  try {
    setLoadingPay(true)
    const response = await checkoutViaBilling({
      invoiceId,
      orderType,
    })

    if (response.success) {
      const data = response
      setPaymentSuccessData((prevData) => ({
        ...prevData,
        transactionId: data.transactionId ?? '',
        paymentMethod: data.paymentMethod ?? 'BILLING',
        pp_account: 'Billed',
        cc_last4: data.cc_last4 ?? '',
        amount: data.invoice?.amount ?? 0,
      }))
      setPaymentSuccess(true)
    } else {
      toast.error(`Failed to order the file`)
    }
  } catch (error) {
    toast.error(`Failed to order the file`)
  } finally {
    setLoadingPay(false)
  }
}
