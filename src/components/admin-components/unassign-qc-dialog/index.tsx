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
import { BACKEND_URL } from '@/constants'
import axiosInstance from '@/utils/axios'

interface DialogProps {
  open: boolean
  onClose: () => void
  fileId: string
}

const UnassignQcDialog = ({ open, onClose, fileId }: DialogProps) => {
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await axiosInstance.post(`${BACKEND_URL}/om/unassign-qc`, {
        fileId,
      })
      const successToastId = toast.success(`Successfully unassigned Editor`)
      toast.dismiss(successToastId)
      setLoading(false)
      onClose()
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        const errorToastId = toast.error(error.response?.data?.s)
        toast.dismiss(errorToastId)
      } else {
        toast.error(`Error unassigning Editor`)
      }
      setLoading(false)
    }
  }
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unassign Editor</AlertDialogTitle>
          <AlertDialogDescription>
            <div className='grid items-center gap-1.5'>
              <Label>
                Please confirm that the Editor assignment has to be removed.
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
            ) : (
              'Unassign'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default UnassignQcDialog
