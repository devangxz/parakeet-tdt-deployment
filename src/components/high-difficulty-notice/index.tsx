'use client'

import { useRouter } from 'next/navigation'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

interface HighDifficultyNoticeProps {
  count: number
}

export default function HighDifficultyNotice({
  count,
}: HighDifficultyNoticeProps) {
  const router = useRouter()

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
            Accept / Decline
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}
