import { ReloadIcon } from '@radix-ui/react-icons'
import axios from 'axios'
import { useState } from 'react'
import { toast } from 'sonner'

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

interface DeleteFileDialogProps {
  open: boolean
  onClose: () => void
  fileId: string
  filename: string
  refetch: () => void
}

const DeleteFileDialog = ({
  open,
  onClose,
  fileId,
  filename,
  refetch,
}: DeleteFileDialogProps) => {
  const [deleteLoading, setDeleteLoading] = useState(false)

  const handleDeleteFile = async () => {
    setDeleteLoading(true)
    try {
      await axios.post(`/api/files/delete`, {
        data: { fileId: [fileId] },
      })
      setDeleteLoading(false)
      onClose()
      refetch()
      toast.success(`${filename} deleted successfully`)
    } catch (error) {
      setDeleteLoading(false)
      toast.error(`Failed to delete ${filename}`)
      throw error
    }
  }

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Are you sure, you want to delete the {filename}?
          </AlertDialogTitle>
          <AlertDialogDescription className='text-red-500'>
            Note: This action is permanent and irreversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDeleteFile}>
            {deleteLoading ? (
              <>
                Please wait
                <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
              </>
            ) : (
              'Delete File'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default DeleteFileDialog
