'use client'
import { ReloadIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import { toast } from 'sonner'

import { deleteFilesAction } from '@/app/actions/files/delete'
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
      const response = await deleteFilesAction(fileId)
      if (response.success) {
        setDeleteLoading(false)
        onClose()
        refetch()
        toast.success(`${filename} deleted successfully`)
      } else {
        setDeleteLoading(false)
        toast.error(`Failed to delete ${filename}`)
      }
    } catch (error) {
      setDeleteLoading(false)
      toast.error(`Failed to delete ${filename}`)
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
