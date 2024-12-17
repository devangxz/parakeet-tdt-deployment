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
  fileIds: string[]
  refetch: () => void
}

const DeleteBulkFileModal = ({
  open,
  onClose,
  fileIds,
  refetch,
}: DeleteFileDialogProps) => {
  const [deleteLoading, setDeleteLoading] = useState(false)

  const handleDeleteFile = async () => {
    setDeleteLoading(true)
    try {
      const response = await deleteFilesAction(fileIds)
      if (response.success) {
        setDeleteLoading(false)
        onClose()
        refetch()
        toast.success(`Deleted files successfully`)
      } else {
        setDeleteLoading(false)
        toast.error(`Failed to delete files. Please try again.`)
      }
    } catch (error) {
      setDeleteLoading(false)
      toast.error(`Failed to delete files. Please try again.`)
    }
  }

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Are you sure, you want to delete the selected files?
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
              'Delete'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default DeleteBulkFileModal
