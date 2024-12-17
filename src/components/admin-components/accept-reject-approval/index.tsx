'use client'

import { ReloadIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import { toast } from 'sonner'

import { acceptApprovalOrder } from '@/app/actions/om/accept-approval-order'
import { rejectApprovalOrder } from '@/app/actions/om/reject-approval-order'
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
    try {
      if (isAccept) {
        const result = await acceptApprovalOrder(Number(orderId))
        if (result.success) {
          const successToastId = toast.success(
            `Successfully accepted approval file`
          )
          toast.dismiss(successToastId)
          refetch()
          onClose()
        } else {
          toast.error(result.message)
        }
      } else {
        const result = await rejectApprovalOrder({ orderId: Number(orderId) })
        if (result.success) {
          const successToastId = toast.success(
            `Successfully rejected approval file`
          )
          toast.dismiss(successToastId)
          refetch()
          onClose()
        } else {
          toast.error(result.message)
        }
      }
    } catch (error) {
      toast.error(`Error ${isAccept ? 'accepting' : 'rejecting'} approval file`)
    } finally {
      setLoading(false)
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
