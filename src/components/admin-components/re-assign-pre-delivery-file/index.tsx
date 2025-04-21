'use client'

import { ReloadIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import { toast } from 'sonner'

import { reassignPreDeliveryOrder } from '@/app/actions/om/reassign-pre-delivery-order'
import { QCReviewerSelect } from '@/components/admin-components/qc-reviewer-select'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import isValidEmail from '@/utils/isValidEmail'

interface DialogProps {
  open: boolean
  onClose: () => void
  orderId: string
  refetch: () => void
}

const ReassignPreDeliveryFile = ({
  open,
  onClose,
  orderId,
  refetch,
}: DialogProps) => {
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [retainEarnings, setRetainEarnings] = useState('no')
  const [retainTranscript, setRetainTranscript] = useState('yes')

  const handleSubmit = async () => {
    if (!userEmail) return toast.error('Please enter a valid email address')
    if (!isValidEmail(userEmail)) {
      toast.error('Please enter a valid email address.')
      return
    }
    setLoading(true)
    try {
      const result = await reassignPreDeliveryOrder({
        orderId: Number(orderId),
        userEmail,
        retainEarnings: retainEarnings === 'yes',
        retainTranscript: retainTranscript === 'yes',
      })
      if (result.success) {
        const successToastId = toast.success(`Successfully re-assigned Editor`)
        toast.dismiss(successToastId)
        onClose()
        refetch()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(`Error re-assigning Editor`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Re-assign Editor</AlertDialogTitle>
          <AlertDialogDescription>
            <div className='grid items-center gap-1.5'>
              <Label>Please select an Editor from the list below.</Label>
              <QCReviewerSelect
                value={userEmail}
                onChange={setUserEmail}
                triggerOnLoad={open}
                placeholder='Editor Email'
              />
            </div>
            <div className='grid items-center gap-1.5 mt-5 mb-5'>
              <Label>Retain Earnings.</Label>
              <RadioGroup
                value={retainEarnings}
                onValueChange={(value) => setRetainEarnings(value)}
              >
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='yes' id='yes' />
                  <Label htmlFor='yes'>Yes</Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='no' id='no' />
                  <Label htmlFor='no'>No</Label>
                </div>
              </RadioGroup>
            </div>
            <div className='grid items-center gap-1.5'>
              <Label>Retain Transcript.</Label>
              <RadioGroup
                value={retainTranscript}
                onValueChange={(value) => setRetainTranscript(value)}
              >
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='yes' id='yes' />
                  <Label htmlFor='yes'>Yes</Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='no' id='no' />
                  <Label htmlFor='no'>No</Label>
                </div>
              </RadioGroup>
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
              'Re-assign'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default ReassignPreDeliveryFile
