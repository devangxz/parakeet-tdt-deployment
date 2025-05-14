'use client'

import { ReloadIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import { toast } from 'sonner'

import { assignQC } from '@/app/actions/om/assign-qc'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import isValidEmail from '@/utils/isValidEmail'

interface DialogProps {
  open: boolean
  onClose: () => void
  fileId: string
  refetch: () => void
}

const AssignQcDialog = ({ open, onClose, fileId, refetch }: DialogProps) => {
  const [userEmail, setUserEmail] = useState('')
  const [resetTimer, setResetTimer] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!userEmail) return toast.error('Please select a valid QC or Reviewer')
    if (!isValidEmail(userEmail)) {
      toast.error('Please select a valid QC or Reviewer.')
      return
    }
    setLoading(true)
    try {
      const result = await assignQC(fileId, userEmail, resetTimer)
      if (result.success) {
        const message = resetTimer
          ? 'Successfully reset timer'
          : 'Successfully assigned Editor'
        const successToastId = toast.success(message)
        toast.dismiss(successToastId)
        onClose()
        refetch()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(`Error assigning Editor`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Assign Editor</AlertDialogTitle>
          <AlertDialogDescription>
            <div className='grid items-center gap-1.5'>
              <Label>Please select an Editor from the list below.</Label>
              <QCReviewerSelect
                value={userEmail}
                onChange={setUserEmail}
                triggerOnLoad={open}
                placeholder='Select an Editor...'
              />
              <div className='flex items-center gap-2 mt-2'>
                <Checkbox
                  id='reset-timer'
                  checked={resetTimer}
                  onCheckedChange={(checked) => setResetTimer(checked === true)}
                />
                <Label htmlFor='reset-timer'>Reset Timer</Label>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Close</AlertDialogCancel>
          <AlertDialogAction onClick={handleSubmit} disabled={loading}>
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

export default AssignQcDialog
