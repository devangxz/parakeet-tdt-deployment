import { ReloadIcon } from '@radix-ui/react-icons'
import axios, { AxiosError } from 'axios'
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
import { Label } from '@/components/ui/label'

interface DialogProps {
  open: boolean
  onClose: () => void
  orderId: string
  isAccept: boolean
  refetch: () => void
}

const AcceptRejectApprovalFileDialog = ({
  open,
  onClose,
  orderId,
  isAccept,
  refetch,
}: DialogProps) => {
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    if (isAccept) {
      try {
        const response = await axios.post(`/api/om/accept-approval-order`, {
          orderId,
        })
        if (response.data.success) {
          const successToastId = toast.success(
            `Successfully accepted approval file`
          )
          toast.dismiss(successToastId)
          setLoading(false)
          refetch()
          onClose()
        } else {
          toast.error(response.data.message)
          setLoading(false)
        }
      } catch (error) {
        if (error instanceof AxiosError && error.response) {
          const errorToastId = toast.error(error.response?.data?.s)
          toast.dismiss(errorToastId)
        } else {
          toast.error(`Error accepting approval file`)
        }
        setLoading(false)
      }
    } else {
      try {
        const response = await axios.post(`/api/om/reject-approval-order`, {
          orderId,
        })
        if (response.data.success) {
          const successToastId = toast.success(
            `Successfully rejected approval file`
          )
          toast.dismiss(successToastId)
          setLoading(false)
          refetch()
          onClose()
        } else {
          toast.error(response.data.message)
          setLoading(false)
        }
      } catch (error) {
        if (error instanceof AxiosError && error.response) {
          const errorToastId = toast.error(error.response?.data?.s)
          toast.dismiss(errorToastId)
        } else {
          toast.error(`Error rejecting approval file`)
        }
        setLoading(false)
      }
    }
  }
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isAccept ? 'Accept File' : 'Reject File'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            <div className='grid items-center gap-1.5'>
              <Label>
                {isAccept
                  ? 'Are you sure you want to accept this screen file?'
                  : 'Are you sure you want to reject this screen file?'}
              </Label>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Close</AlertDialogCancel>
          <AlertDialogAction onClick={handleSubmit}>
            {loading ? (
              <>
                Please wait
                <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
              </>
            ) : isAccept ? (
              'Accept'
            ) : (
              'Reject'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default AcceptRejectApprovalFileDialog
