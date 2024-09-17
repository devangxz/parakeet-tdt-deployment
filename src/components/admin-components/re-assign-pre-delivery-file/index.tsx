import { ReloadIcon } from '@radix-ui/react-icons'
import { AxiosError } from 'axios'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { BACKEND_URL } from '@/constants'
import axiosInstance from '@/utils/axios'
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
      await axiosInstance.post(
        `${BACKEND_URL}/om/reassign-pre-delivery-order`,
        {
          orderId,
          userEmail,
          retainEarnings: retainEarnings === 'yes',
          retainTranscript: retainTranscript === 'yes',
        }
      )
      const successToastId = toast.success(`Successfully re-assigned Editor`)
      toast.dismiss(successToastId)
      setLoading(false)
      onClose()
      refetch()
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        const errorToastId = toast.error(error.response?.data?.s)
        toast.dismiss(errorToastId)
      } else {
        toast.error(`Error re-assigning Editor`)
      }
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
              <Label>Please enter Editor email below.</Label>
              <Input
                value={userEmail}
                type='email'
                onChange={(event) => setUserEmail(event.target.value)}
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
