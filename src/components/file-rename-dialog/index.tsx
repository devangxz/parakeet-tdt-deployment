'use client'
import { Cross1Icon, ReloadIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import { toast } from 'sonner'

import { renameFileAction } from '@/app/actions/file/rename'
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

interface UpdateFileNameProps {
  open: boolean
  onClose: () => void
  fileId: string
  filename: string
  refetch: () => void
}

const RenameFileDialog = ({
  open,
  onClose,
  fileId,
  filename,
  refetch,
}: UpdateFileNameProps) => {
  const [newName, setNewName] = useState<string>(filename)
  const [updateLoading, setUpdateLoading] = useState(false)

  const handleRenameFile = async () => {
    setUpdateLoading(true)
    try {
      const response = await renameFileAction(fileId, newName)
      if (response.success) {
        toast.success(`Successfully renamed file to ${newName}`)
        refetch()
        onClose()
      } else {
        toast.error('Failed to rename file')
      }
    } catch (error) {
      toast.error('Failed to rename file')
    } finally {
      setUpdateLoading(false)
    }
  }

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <Cross1Icon onClick={() => onClose()} style={{ marginLeft: 'auto' }} />
        <AlertDialogHeader>
          <AlertDialogTitle>Rename file:</AlertDialogTitle>
          <AlertDialogDescription>
            <div className='flex flex-col items-end space-y-4'>
              <Input
                type='text'
                onChange={(event) => setNewName(event?.target?.value)}
                placeholder='New File Name'
                value={newName}
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleRenameFile}>
            {updateLoading ? (
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

export default RenameFileDialog
