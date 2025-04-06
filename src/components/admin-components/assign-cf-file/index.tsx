'use client'

import { ReloadIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import { toast } from 'sonner'

import { assignCF } from '@/app/actions/om/assign-cf'
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
import isValidEmail from '@/utils/isValidEmail'

interface DialogProps {
  open: boolean
  onClose: () => void
  fileId: string
}

const AssignCfDialog = ({ open, onClose, fileId }: DialogProps) => {
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!userEmail) return toast.error('Please enter a valid email address')
    if (!isValidEmail(userEmail)) {
      toast.error('Please enter a valid email address.')
      return
    }
    setLoading(true)
    try {
      const result = await assignCF(fileId, userEmail)
      if (result.success) {
        const successToastId = toast.success(`Successfully assigned CF`)
        toast.dismiss(successToastId)
        onClose()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(`Error assigning CF`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Assign CF</AlertDialogTitle>
          <AlertDialogDescription>
            <div className='grid items-center gap-1.5'>
              <Label>Please enter transcriber email below.</Label>
              <Input
                value={userEmail}
                type='email'
                onChange={(event) => setUserEmail(event.target.value)}
                placeholder='Transcriber Email'
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
              'Assign'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default AssignCfDialog
