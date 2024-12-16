'use client'

import { ReloadIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import { toast } from 'sonner'

import { acceptScreenFile } from '@/app/actions/om/accept-screen-file'
import { rejectScreenFile } from '@/app/actions/om/reject-screen-file'
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

const AcceptRejectScreenFileDialog = ({
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
        const result = await acceptScreenFile(Number(orderId))
        if (result.success) {
          const successToastId = toast.success(
            `Successfully accepted screen file`
          )
          toast.dismiss(successToastId)
          refetch()
          onClose()
        } else {
          toast.error(result.message)
        }
      } else {
        const result = await rejectScreenFile({ orderId: Number(orderId) })
        if (result.success) {
          const successToastId = toast.success(
            `Successfully rejected screen file`
          )
          toast.dismiss(successToastId)
          refetch()
          onClose()
        } else {
          toast.error(result.message)
        }
      }
    } catch (error) {
      toast.error(`Error ${isAccept ? 'accepting' : 'rejecting'} screen file`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isAccept ? 'Accept Screen File' : 'Reject Screen File'}
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

export default AcceptRejectScreenFileDialog
