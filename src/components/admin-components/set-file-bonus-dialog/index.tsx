'use client'

import { ReloadIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import { toast } from 'sonner'

import { updateBonus } from '@/app/actions/om/update-bonus'
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
      const result = await updateBonus({
        fileId,
        rate: Number(rate),
      })
      if (result.success) {
        const successToastId = toast.success(`Successfully updated file bonus`)
        toast.dismiss(successToastId)
        onClose()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(`Error updating file rate`)
    } finally {
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
