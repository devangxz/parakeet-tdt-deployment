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
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { BACKEND_URL } from '@/constants'
import axiosInstance from '@/utils/axios'

interface DialogProps {
  open: boolean
  onClose: () => void
  orderId: string
  refetch: () => void
}

const DeliveryPreDeliveryFile = ({
  open,
  onClose,
  orderId,
  refetch,
}: DialogProps) => {
  const [loading, setLoading] = useState(false)
  const [retainEarnings, setRetainEarnings] = useState('yes')

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await axiosInstance.post(`${BACKEND_URL}/om/deliver-pre-delivery-order`, {
        orderId,
        retainEarnings: retainEarnings === 'yes',
      })
      const successToastId = toast.success(`Successfully delivered the file`)
      toast.dismiss(successToastId)
      setLoading(false)
      refetch()
      onClose()
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        const errorToastId = toast.error(error.response?.data?.s)
        toast.dismiss(errorToastId)
      } else {
        toast.error(`Error delivering the file`)
      }
      setLoading(false)
    }
  }
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deliver File</AlertDialogTitle>
          <AlertDialogDescription>
            <div className='grid items-center gap-1.5'>
              <Label>Are you sure you want to deliver file?</Label>
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
              'Deliver'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default DeliveryPreDeliveryFile
