import { ReloadIcon } from '@radix-ui/react-icons'
import axios, { AxiosError } from 'axios'
import { signOut } from 'next-auth/react'
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
import { Input } from '@/components/ui/input'
import { mapKeyToMessage } from '@/utils/error-util'

interface DeleteAccountDialogProps {
  open: boolean
  onClose: () => void
}

const DeleteAccountDialog = ({ open, onClose }: DeleteAccountDialogProps) => {
  const [deleteLoading, setdeleteLoading] = useState(false)
  const [password, setPassword] = useState<string>('')
  const handleDeleteAccount = async () => {
    setdeleteLoading(true)
    try {
      const response = await axios.post(
        `/api/user/delete-account?password=${password}`
      )
      setdeleteLoading(false)
      onClose()
      const message = mapKeyToMessage(response.data.message)
      const successToastId = toast.success(message)
      toast.dismiss(successToastId)
      signOut({ callbackUrl: process.env.NEXT_PUBLIC_SITE_URL })
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        const message = mapKeyToMessage(error.response.data.message)
        const errorToastId = toast.error(message)
        toast.dismiss(errorToastId)
      } else {
        toast.error(`Error fetching default instructions ${error}`)
      }
      setdeleteLoading(false)
    }
  }

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Account</AlertDialogTitle>
          <AlertDialogDescription className='text-red-500'>
            Note: This action is permanent and irreversible. All data associated
            with your account will be removed from our servers and you will be
            logged out.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogDescription>
          <Input
            type='password'
            placeholder='Enter password'
            onChange={(e) => setPassword(e.target.value)}
          />
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDeleteAccount}>
            {deleteLoading ? (
              <>
                Please wait
                <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
              </>
            ) : (
              'Delete Account'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default DeleteAccountDialog
