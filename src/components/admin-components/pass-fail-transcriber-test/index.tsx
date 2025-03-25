'use client'

import { ReloadIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import { toast } from 'sonner'

import { failTranscriberTest } from '@/app/actions/om/fail-transcriber-test'
import { passTranscriberTest } from '@/app/actions/om/pass-transcriber-test'
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

interface DialogProps {
  open: boolean
  onClose: () => void
  orderId: string
  isAccept: boolean
  refetch: () => void
  transcriber?: {
    name: string
    email: string
    id: string
  }
}

const PassFailTranscriberTestDialog = ({
  open,
  onClose,
  orderId,
  isAccept,
  refetch,
  transcriber,
}: DialogProps) => {
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    try {
      if (isAccept) {
        if (transcriber) {
          const result = await passTranscriberTest(Number(orderId))
          if (result.success) {
            const successToastId = toast.success(
              `Successfully passed transcriber test`
            )
            toast.dismiss(successToastId)
            refetch()
            onClose()
          } else {
            toast.error(result.message)
          }
        }
      } else {
        if (transcriber) {
          const result = await failTranscriberTest(Number(orderId))
          if (result.success) {
            const successToastId = toast.success(
              `Successfully failed transcriber test`
            )
            toast.dismiss(successToastId)
            refetch()
            onClose()
          } else {
            toast.error(result.message)
          }
        }
      }
    } catch (error) {
      toast.error(`Error ${isAccept ? 'accepting' : 'rejecting'} approval file`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isAccept
              ? transcriber
                ? 'Pass Transcriber Test'
                : 'Accept File'
              : transcriber
              ? 'Fail Transcriber Test'
              : 'Reject File'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            <div className='grid items-center gap-1.5'>
              <Label>
                {isAccept
                  ? `Are you sure you want to pass this test file${
                      transcriber
                        ? ` for ${transcriber.name} (${transcriber.email})`
                        : ''
                    }?`
                  : `Are you sure you want to fail this test file${
                      transcriber
                        ? ` for ${transcriber.name} (${transcriber.email})`
                        : ''
                    }?`}
              </Label>
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
            ) : isAccept ? (
              transcriber ? (
                'Pass'
              ) : (
                'Accept'
              )
            ) : transcriber ? (
              'Fail'
            ) : (
              'Reject'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default PassFailTranscriberTestDialog
