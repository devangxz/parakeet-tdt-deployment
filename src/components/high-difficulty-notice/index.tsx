'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import HighDifficultyFilesDialog from '@/components/high-difficulty-files-dialog'
import HighDifficultyRefundDialog from '@/components/high-difficulty-refund-dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

interface HighDifficultyNoticeProps {
  count: number
  onRefundSuccess?: () => void
}

export default function HighDifficultyNotice({
  count,
  onRefundSuccess,
}: HighDifficultyNoticeProps) {
  const router = useRouter()
  const [openRefundDialog, setOpenRefundDialog] = useState(false)
  const [openFilesDialog, setOpenFilesDialog] = useState(false)

  if (count <= 0) {
    return null
  }

  return (
    <Alert className='mb-4 border-primary bg-primary/10 border'>
      <AlertTitle className='text-primary font-semibold'>
        Additional Charges
      </AlertTitle>
      <AlertDescription className='flex flex-col gap-3'>
        <p className='text-primary'>
          There {count === 1 ? 'is 1 file' : `are ${count} files`} with
          additional charges which require action. Please click the button below
          to accept or decline.
        </p>
        <div className='flex gap-2 mt-1'>
          <Button
            onClick={() => router.push('/payments/pending')}
            className='text-white not-rounded'
          >
            Accept
          </Button>
          <Button
            variant='outline'
            className='not-rounded'
            onClick={() => setOpenFilesDialog(true)}
          >
            Check all
          </Button>
          <Button
            variant='destructive'
            className='not-rounded'
            onClick={() => setOpenRefundDialog(true)}
          >
            Decline
          </Button>
        </div>
      </AlertDescription>
      <HighDifficultyRefundDialog
        open={openRefundDialog}
        onClose={() => setOpenRefundDialog(false)}
        onSuccess={onRefundSuccess}
      />
      <HighDifficultyFilesDialog
        open={openFilesDialog}
        onClose={() => setOpenFilesDialog(false)}
      />
    </Alert>
  )
}
