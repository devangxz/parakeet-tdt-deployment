'use client'
import { Cross1Icon, ReloadIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import { toast } from 'sonner'

import { cancelOrderAction } from '@/app/actions/file/cancel-order'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { ORDER_CANCEL_PROGRESS } from '@/constants'

interface CancelOrderProps {
  open: boolean
  onClose: () => void
  fileId: string
  filename: string
  refetch: () => void
  amount: number
}

const CancelOrderDialog = ({
  open,
  onClose,
  fileId,
  filename,
  refetch,
  amount,
}: CancelOrderProps) => {
  const [cancelLoading, setCancelLoading] = useState(false)

  const handleCancelOrder = async () => {
    setCancelLoading(true)
    try {
      const response = await cancelOrderAction(fileId)
      if (response.success) {
        toast.success(`Successfully cancelled the order of ${filename}`)
        refetch()
        onClose()
      } else {
        toast.error(
          `Your file has already reached >${ORDER_CANCEL_PROGRESS} completion and cannot be canceled. Please refer to our cancelation policy for more details.`
        )
      }
    } catch (error) {
      toast.error(
        `Your file has already reached >${ORDER_CANCEL_PROGRESS} completion and cannot be canceled. Please refer to our cancelation policy for more details.`
      )
    } finally {
      setCancelLoading(false)
    }
  }

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <Cross1Icon onClick={() => onClose()} style={{ marginLeft: 'auto' }} />
        <AlertDialogHeader>
          <AlertDialogTitle>
            Are you sure, you want to cancel the order of {filename}?
          </AlertDialogTitle>
          <AlertDialogDescription className='text-red-500'>
            The full amount paid <b>${amount}</b>, will be refunded at this
            stage.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleCancelOrder}>
            {cancelLoading ? (
              <>
                Please wait
                <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
              </>
            ) : (
              'Yes, Cancel Order'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default CancelOrderDialog
