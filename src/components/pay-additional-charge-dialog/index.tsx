/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'
import { ReloadIcon } from '@radix-ui/react-icons'
import { Dropin } from 'braintree-web-drop-in'
import DropIn from 'braintree-web-drop-in-react'
import { Session } from 'next-auth'
import { useState } from 'react'

import PaymentSuccessIcon from '../payment-success'
import { checkout } from '@/app/actions/payment/checkout'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'

interface DialogProps {
  open: boolean
  onClose: () => void
  clientToken: string
  session: Session
  invoiceId: string
  amount: string
}

interface PaymentSuccessData {
  transactionId: string
  paymentMethod: string
  pp_account?: string
  cc_last4?: string
  amount: number
}

const AdditionalProofreadingDialog = ({
  open,
  onClose,
  clientToken,
  session,
  invoiceId,
  amount,
}: DialogProps) => {
  const [instance, setInstance] = useState<Dropin | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false)
  const [paymentSuccessData, setPaymentSuccessData] =
    useState<PaymentSuccessData | null>(null)

  const handlePaymentMethod = async () => {
    if (!instance) return

    try {
      setIsLoading(true)
      const { nonce } = await instance.requestPaymentMethod()

      const result = await checkout({
        paymentMethodNonce: nonce,
        invoiceId,
        orderType: 'TRANSCRIPTION',
      })

      if (result.success) {
        setPaymentSuccessData({
          transactionId: result.transactionId ?? '',
          paymentMethod: result.paymentMethod ?? '',
          pp_account: result.pp_account,
          cc_last4: result.cc_last4,
          amount: result.invoice?.amount ?? 0,
        })
        setPaymentSuccess(true)
      }
    } catch (err) {
      console.error('Error processing payment:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className='sm:max-w-[792px]'>
          <DialogHeader>
            <DialogTitle>
              Additional Proofreading Invoice of ${amount}
            </DialogTitle>
          </DialogHeader>
          {clientToken && !paymentSuccess && (
            <DropIn
              options={{
                authorization: clientToken,
                paypal: {
                  flow: 'vault',
                },
              }}
              onInstance={(instance) => setInstance(instance)}
            />
          )}
          {paymentSuccess && (
            <>
              <div className='flex flex-col justify-center items-center mb-6 mt-[-40px]'>
                <PaymentSuccessIcon />
                <div className='text-lg font-medium mr-5 mt-[-40px]'>
                  Payment Successful!
                </div>
              </div>
              <div className='flex justify-between mr-5 mb-3'>
                <div className='flex items-center gap-2'>
                  <div className='text-md font-medium'>Type</div>
                </div>
                <div className='text-md font-normal'>
                  Additional Proofreading
                </div>
              </div>
              <div className='flex justify-between mr-5 mb-3'>
                <div className='flex items-center gap-2'>
                  <div className='text-md font-medium'>Transaction ID</div>
                </div>
                <div className='text-md font-normal'>
                  {paymentSuccessData?.transactionId}
                </div>
              </div>
              <div className='flex justify-between mr-5 mb-3'>
                <div className='flex items-center gap-2'>
                  <div className='text-md font-medium'>Payment Method</div>
                </div>
                <div className='text-md font-normal'>
                  {paymentSuccessData?.paymentMethod}
                </div>
              </div>
              <div className='flex justify-between mr-5 mb-3'>
                <div className='flex items-center gap-2'>
                  <div className='text-md font-medium'>
                    {paymentSuccessData?.cc_last4 ? 'Card ending' : 'PP'}
                  </div>
                </div>
                <div className='text-md font-normal'>
                  {paymentSuccessData?.cc_last4 ||
                    paymentSuccessData?.pp_account}
                </div>
              </div>
              <Separator className='bg-[#322078]' />
              <div className='flex justify-between mr-5 mb-4 mt-4'>
                <div className='flex items-center gap-2'>
                  <div className='text-lg font-semibold'>Final amount</div>
                </div>
                <div className='text-lg font-semibold'>
                  ${paymentSuccessData?.amount}
                </div>
              </div>
            </>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant='order'>Close</Button>
            </DialogClose>
            {!paymentSuccess && (
              <>
                {isLoading ? (
                  <Button disabled>
                    Please wait
                    <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
                  </Button>
                ) : (
                  <Button className='w-[120px]' onClick={handlePaymentMethod}>
                    Pay Now
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default AdditionalProofreadingDialog
