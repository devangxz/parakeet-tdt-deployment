/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { ReloadIcon } from '@radix-ui/react-icons'
import { Dropin } from 'braintree-web-drop-in'
import DropIn from 'braintree-web-drop-in-react'
import { Session } from 'next-auth'
import { useState } from 'react'
import { toast } from 'sonner'

import { addPaymentMethod } from '@/app/actions/payment/add-payment-method'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from '@/components/ui/dialog'

interface AddPaymentMethodDialogProps {
  open: boolean
  onClose: () => void
  clientToken: string
  session: Session
}

const AddPaymentMethodDialog = ({
  open,
  onClose,
  clientToken,
  session,
}: AddPaymentMethodDialogProps) => {
  const [instance, setInstance] = useState<Dropin | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handlePaymentMethod = async () => {
    if (!instance) return

    try {
      setIsLoading(true)
      const { nonce } = await instance.requestPaymentMethod()

      const result = await addPaymentMethod({
        paymentMethodNonce: nonce,
      })

      if (result.success) {
        onClose()
        toast.success('Payment Method Added Successfully')
      } else {
        throw new Error('Failed to add payment method')
      }
    } catch (err) {
      toast.error('Error adding payment method')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className='sm:max-w-[792px]'>
          <DialogHeader>
            <DialogTitle>Add Payment Method</DialogTitle>
          </DialogHeader>
          {clientToken && (
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
          <DialogFooter>
            <DialogClose asChild>
              <Button variant='order'>Close</Button>
            </DialogClose>
            {isLoading ? (
              <Button disabled>
                Please wait
                <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
              </Button>
            ) : (
              <Button className='w-[120px]' onClick={handlePaymentMethod}>
                Add
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default AddPaymentMethodDialog
