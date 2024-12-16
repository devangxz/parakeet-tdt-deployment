'use client'

import { ReloadIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import { toast } from 'sonner'

import { updateDifficulty } from '@/app/actions/om/update-difficulty'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface DialogProps {
  open: boolean
  onClose: () => void
  fileId: string
}

const SetFileDifficultyDialog = ({ open, onClose, fileId }: DialogProps) => {
  const [difficulty, setDifficulty] = useState('medium')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const result = await updateDifficulty({
        fileId,
        difficulty: difficulty as 'low' | 'medium' | 'high',
      })
      if (result.success) {
        const successToastId = toast.success(
          `Successfully updated difficulty level`
        )
        toast.dismiss(successToastId)
        onClose()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error(`Error updating difficulty level`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Set Difficulty Level</AlertDialogTitle>
          <AlertDialogDescription>
            <div className='grid items-center gap-1.5'>
              <Label>Please choose the difficlulty level below.</Label>
              <Select
                defaultValue={difficulty}
                onValueChange={(value) => setDifficulty(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Difficulty level' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='low'>Low</SelectItem>
                  <SelectItem value='medium'>Medium</SelectItem>
                  <SelectItem value='high'>High</SelectItem>
                </SelectContent>
              </Select>
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

export default SetFileDifficultyDialog
