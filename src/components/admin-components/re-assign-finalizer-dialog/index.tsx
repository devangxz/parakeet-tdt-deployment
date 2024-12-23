'use client'

import { ReloadIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import { toast } from 'sonner'

import { reassignFinalizer } from '@/app/actions/om/reassign-finalizer'
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
import isValidEmail from '@/utils/isValidEmail'

interface DialogProps {
  open: boolean
  onClose: () => void
  orderId: string
  refetch: () => void
  isCompleted: boolean
}

const ReassignFinalizer = ({
  open,
  onClose,
  orderId,
  refetch,
  isCompleted,
}: DialogProps) => {
  const [userEmail, setUserEmail] = useState('')
  const [retainEarnings, setRetainEarnings] = useState('no')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!userEmail) return toast.error('Please enter a valid email address')
    if (!isValidEmail(userEmail)) {
      toast.error('Please enter a valid email address.')
      return
    }
    setLoading(true)
    try {
      const result = await reassignFinalizer({
        orderId: Number(orderId),
        userEmail,
        retainEarnings: retainEarnings === 'yes',
        isCompleted,
      })
      if (result.success) {
        const successToastId = toast.success(
          `Successfully re-assigned finalizer`
        )
        toast.dismiss(successToastId)
        onClose()
        refetch()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(`Error re-assigning finalizer`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Re-assign Finalizer</AlertDialogTitle>
          <AlertDialogDescription>
            <div className='grid items-center gap-1.5'>
              <Label>Please enter Finalizer email below.</Label>
              <Input
                value={userEmail}
                type='email'
                onChange={(event) => setUserEmail(event.target.value)}
                placeholder='Finalizer Email'
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

export default ReassignFinalizer
