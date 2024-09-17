import { ReloadIcon } from '@radix-ui/react-icons'
import { useState } from 'react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface RemoveUserDialogProps {
  open: boolean
  onClose: () => void
  fileId: string
  controllerType: string
  controller: (fileId: string, type: string) => Promise<void>
}

const BulkArchiveFileDialog = ({
  open,
  onClose,
  fileId,
  controllerType,
  controller,
}: RemoveUserDialogProps) => {
  const [archiveLoading, setArchiveLoading] = useState(false)

  const handleArchiveFile = async () => {
    setArchiveLoading(true)
    try {
      await controller(fileId, controllerType)
      setArchiveLoading(false)
      onClose()
    } catch (error) {
      throw error
    }
  }

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Are you sure, you want to Archive these files?
          </AlertDialogTitle>
          <AlertDialogDescription className='text-red-500'>
            Note: You can find the archived files in archived page.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleArchiveFile}>
            {archiveLoading ? (
              <>
                Please wait
                <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
              </>
            ) : (
              'Archive'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default BulkArchiveFileDialog
