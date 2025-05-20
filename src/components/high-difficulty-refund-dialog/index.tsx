'use client'

import { ReloadIcon } from '@radix-ui/react-icons'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

import {
  getTotalHDRefundAmountAction,
  refundHighDifficultyAction,
} from '@/app/actions/admin/refund-high-difficulty'
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

interface HighDifficultyRefundDialogProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function HighDifficultyRefundDialog({
  open,
  onClose,
  onSuccess,
}: HighDifficultyRefundDialogProps) {
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [amount, setAmount] = useState<string>('0.00')

  useEffect(() => {
    async function fetchAmount() {
      if (open) {
        setLoading(true)
        try {
          const resp = await getTotalHDRefundAmountAction()
          if (resp.success) {
            setAmount(resp.amount ?? '0.00')
          } else {
            toast.error(resp.message || 'Failed to fetch refund amount')
          }
        } catch {
          toast.error('Failed to fetch refund amount')
        } finally {
          setLoading(false)
        }
      }
    }
    fetchAmount()
  }, [open])

  const handleRefund = async () => {
    setActionLoading(true)
    try {
      const resp = await refundHighDifficultyAction()
      if (resp.success) {
        toast.success('Refund successful')
        onSuccess?.()
        onClose()
      } else {
        toast.error(resp.message || 'Failed to process refunds')
      }
    } catch (error) {
      toast.error('Error processing refunds')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Decline Additional Charges</AlertDialogTitle>
          <AlertDialogDescription>
            {loading ? (
              <div className='flex items-center'>
                <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                Fetching refund amount...
              </div>
            ) : (
              <p>
                You will be refunded <b>${amount}</b> for all the files. Do you
                want to proceed?
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRefund}
            disabled={loading || actionLoading}
          >
            {actionLoading ? (
              <>
                Processing
                <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
              </>
            ) : (
              'Yes, Cancel'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
