'use client'

import { ReloadIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import { toast } from 'sonner'

import { sendOrderReReviewEmail } from '@/app/actions/order/re-review'
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

interface OrderReReviewModalProps {
  open: boolean
  onClose: () => void
  fileId: string
}

const OrderReReviewModal = ({
  open,
  onClose,
  fileId,
}: OrderReReviewModalProps) => {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const response = await sendOrderReReviewEmail(message ?? '', fileId)
      if (response.success) {
        toast.success('Re-review request sent successfully')
        onClose()
      } else {
        toast.error(response.message || 'Error sending re-review request')
      }
    } catch (error) {
      toast.error('Error sending re-review request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Request Re-Review</AlertDialogTitle>
          <AlertDialogDescription>
            <p>
              Please provide details about why you would like this file to be
              re-reviewed. Support team will review your request and get back to
              you.
            </p>
            <div className='grid gap-4 mt-5'>
              <div className='grid gap-2'>
                <Label htmlFor='message'>Message</Label>
                <Textarea
                  id='message'
                  placeholder='Enter your message here...'
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                Sending Request
                <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
              </>
            ) : (
              'Send Request'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default OrderReReviewModal
