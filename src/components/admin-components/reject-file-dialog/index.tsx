'use client'

import { ReloadIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import { toast } from 'sonner'

import { rejectOrder } from '@/app/actions/om/reject-order'
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
import { Textarea } from '@/components/ui/textarea'

interface DialogProps {
  open: boolean
  onClose: () => void
  orderId: string
  refetch: () => void
}

const RejectFileDialog = ({ open, onClose, orderId, refetch }: DialogProps) => {
  const [loading, setLoading] = useState(false)
  const [comment, setComment] = useState('')

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const result = await rejectOrder({
        orderId: Number(orderId),
        comment,
      })
      if (result.success) {
        const successToastId = toast.success(`Successfully rejected file`)
        toast.dismiss(successToastId)
        onClose()
        refetch()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(`Error rejecting file`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className='sm:max-w-[792px]'>
        <AlertDialogHeader>
          <AlertDialogTitle>Reject File</AlertDialogTitle>
          <AlertDialogDescription>
            <div className='grid items-center gap-1.5'>
              <Label>Are you sure you want to reject this screen file?</Label>
            </div>
            <div className='grid items-center gap-1.5 mt-5'>
              <Label>Comments</Label>
              <Textarea
                placeholder='Rejection comments...'
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className='min-h-[100px]'
              />
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
            ) : (
              'Reject'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default RejectFileDialog
