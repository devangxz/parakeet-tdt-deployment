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
import { BACKEND_URL } from '@/constants'
import axiosInstance from '@/utils/axios'

interface DialogProps {
  open: boolean
  onClose: () => void
  fileId: string
}

const SetFileBonusDialog = ({ open, onClose, fileId }: DialogProps) => {
  const [rate, setRate] = useState(0)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await axiosInstance.post(`${BACKEND_URL}/om/update-bonus`, {
        fileId,
        rate: Number(rate),
      })
      const successToastId = toast.success(`Successfully updated file bonus`)
      toast.dismiss(successToastId)
      setLoading(false)
      onClose()
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        const errorToastId = toast.error(error.response?.data?.s)
        toast.dismiss(errorToastId)
      } else {
        toast.error(`Error updating file rate`)
      }
      setLoading(false)
    }
  }
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Set File Bonus</AlertDialogTitle>
          <AlertDialogDescription>
            <div className='grid items-center gap-1.5'>
              <Label>Please enter the bonus below. (/ah)</Label>
              <Input
                value={rate}
                type='number'
                onChange={(event) => setRate(Number(event.target.value))}
                placeholder='Set Rate'
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
              'Update'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default SetFileBonusDialog
