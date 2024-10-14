import { Cross1Icon, ReloadIcon } from '@radix-ui/react-icons'
import axios from 'axios'
import { useState } from 'react'
import { toast } from 'sonner'

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
  const [updateLoading, setUploadLoading] = useState(false)

  const renameFile = async () => {
    setUploadLoading(true)
    try {
      await axios.post(`/api/file/rename`, {
        fileId,
        filename: newName,
      })
      const successToastId = toast.success(`Successfully updated file name`)
      toast.dismiss(successToastId)
      refetch()
      setUploadLoading(false)
      onClose()
    } catch (err) {
      const errorToastId = toast.error(`Error updating file name`)
      toast.dismiss(errorToastId)
      setUploadLoading(false)
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
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={renameFile}>
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
