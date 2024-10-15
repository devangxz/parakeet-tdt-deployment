/* eslint-disable @typescript-eslint/no-unused-vars */
import { ReloadIcon } from '@radix-ui/react-icons'
import { Dropin } from 'braintree-web-drop-in'
import DropIn from 'braintree-web-drop-in-react'
import { Session } from 'next-auth'
import { useState } from 'react'
import { toast } from 'sonner'

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
    if (instance) {
      instance
        .requestPaymentMethod()
        .then(({ nonce }: { nonce: string }) => {
          setIsLoading(true)
          fetch(`/api/payment/add-payment-method`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session?.user?.token}`,
            },
            body: JSON.stringify({
              paymentMethodNonce: nonce,
            }),
          })
            .then((response) => response.json())
            .then((data) => {
              setIsLoading(false)
              if (data.success) {
                onClose()
                toast.success('Payment Method Added Successfully')
              }
            })
            .catch((err) => {
              setIsLoading(false)
              toast.error('Error adding payment method')
            })
        })
        .catch((err) => {
          setIsLoading(false)
          toast.error('Error adding payment method')
        })
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
