'use client'

import { FileTag } from '@prisma/client'
import { ReloadIcon } from '@radix-ui/react-icons'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

import { revertToDefaultVersionAction } from '@/app/actions/editor/revert-to-default-version'
import { updatePwerAction } from '@/app/actions/om/update-pwer'
import PwerSlider from '@/components/admin-components/pwer-slider'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { buttonVariants } from '@/components/ui/button'

interface RevertToAssemblyAITranscriptDialogProps {
  open: boolean
  onClose: () => void
  orderData: { fileId: string; orderId: number; currentPwer: number } | null
  refetch: () => void
}

export default function RevertToAssemblyAITranscriptDialog({
  open,
  onClose,
  orderData,
  refetch,
}: RevertToAssemblyAITranscriptDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [newPwer, setNewPwer] = useState<number>(orderData?.currentPwer || 0)

  useEffect(() => {
    if (open && orderData) {
      setNewPwer(orderData.currentPwer)
    }
  }, [open, orderData])

  const handleRevert = async () => {
    if (!orderData) {
      toast.error('File ID and order data are required')
      return
    }

    setIsLoading(true)

    try {
      const revertResult = await revertToDefaultVersionAction(
        orderData.fileId,
        FileTag.ASSEMBLY_AI
      )
      if (!revertResult.success) {
        toast.error(
          revertResult.message || 'Failed to revert to AssemblyAI transcript'
        )
        return
      }

      const pwerResponse = await updatePwerAction({
        orderId: orderData.orderId,
        newPwer,
      })
      if (pwerResponse.success) {
        toast.success('Successfully reverted and updated PWER')
      } else {
        toast.error('Reverted but failed to update PWER')
      }

      refetch()
      onClose()
    } catch (error) {
      toast.error('An error occurred while reverting and updating PWER')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className='sm:max-w-2xl'>
        <AlertDialogHeader>
          <AlertDialogTitle>Revert to AssemblyAI Transcript</AlertDialogTitle>
          <AlertDialogDescription>
            This will revert the file back to the original AssemblyAI
            transcript. Please set the PWER (Percentage Word Error Rate) before
            proceeding with the revert.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className='p-2'>
          <PwerSlider value={newPwer} onChange={setNewPwer} />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <button
            onClick={handleRevert}
            disabled={isLoading || newPwer === (orderData?.currentPwer ?? 0)}
            className={buttonVariants()}
          >
            {isLoading ? (
              <>
                <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                Revert
              </>
            ) : (
              'Revert'
            )}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
