import { Cross1Icon, ReloadIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import { toast } from 'sonner'

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
import { BACKEND_URL, ORDER_CANCEL_PROGRESS } from '@/constants'
import axiosInstance from '@/utils/axios'

interface CancelOrderProps {
  open: boolean
  onClose: () => void
  fileId: string
  filename: string
  refetch: () => void
  amount: number
}

const CanceOrderDialog = ({
  open,
  onClose,
  fileId,
  filename,
  refetch,
  amount,
}: CancelOrderProps) => {
  const [cancelLoading, setCancelLoading] = useState(false)

  const renameFile = async () => {
    setCancelLoading(true)
    try {
      await axiosInstance.post(`${BACKEND_URL}/cancel-order/${fileId}`)
      const successToastId = toast.success(
        `Successfully cancelled the order of ${filename}`
      )
      toast.dismiss(successToastId)
      refetch()
      setCancelLoading(false)
      onClose()
    } catch (err) {
      const errorToastId = toast.error(
        `Your file has already reached >${ORDER_CANCEL_PROGRESS} completion and cannot be canceled. Please refer to our cancelation policy for more details.`
      )
      toast.dismiss(errorToastId)
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
          <AlertDialogAction onClick={renameFile}>
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

export default CanceOrderDialog
