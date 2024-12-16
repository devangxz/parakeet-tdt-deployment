'use client'

import { ReloadIcon } from '@radix-ui/react-icons'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

import { updateInstructions } from '@/app/actions/om/update-instructions'
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
  orderInstructions: string
  open: boolean
  onClose: () => void
  fileId: string
}

const SetInstructionsDialog = ({
  orderInstructions,
  open,
  onClose,
  fileId,
}: DialogProps) => {
  const [instructions, setInstructions] = useState(orderInstructions)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const result = await updateInstructions({
        fileId,
        instructions,
      })
      if (result.success) {
        const successToastId = toast.success(
          `Successfully updated instructions`
        )
        toast.dismiss(successToastId)
        onClose()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(`Error updating instructions`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setInstructions(orderInstructions)
  }, [orderInstructions])

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Update Instructions</AlertDialogTitle>
          <AlertDialogDescription>
            <div className='grid items-center gap-1.5'>
              <Label>Please enter the instructions</Label>
              <Textarea
                id='comment'
                className='min-h-32'
                placeholder='Enter instructions here'
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
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

export default SetInstructionsDialog
