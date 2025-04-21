/* eslint-disable react/no-unescaped-entities */
'use client'

import { ReloadIcon } from '@radix-ui/react-icons'
import { useState } from 'react'

import { updateSignOffStatus } from '@/app/actions/transcriber/accept-terms'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface TermsAndConditionsModalProps {
  open: boolean
  contentHtml: string
}

export function TermsAndConditionsModal({
  open,
  contentHtml,
}: TermsAndConditionsModalProps) {
  const [modalOpen, setModalOpen] = useState(open)
  const [initials, setInitials] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleAccept = async () => {
    if (!initials.trim()) return
    setIsLoading(true)
    try {
      await updateSignOffStatus()
      setModalOpen(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={modalOpen} modal={true}>
      <DialogContent className='sm:max-w-[900px]'>
        <DialogHeader>
          <DialogTitle>Terms and Conditions</DialogTitle>
          <DialogDescription>
            Please sign and accept the Terms & Conditions to continue
          </DialogDescription>
        </DialogHeader>
        <div className='max-h-[400px] overflow-y-auto my-6 prose prose-sm prose-slate'>
          <article className='markdown-content'>
            <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
          </article>
        </div>
        <div className=''>
          <div className='grid gap-6'>
            <div className='grid gap-3'>
              <Label htmlFor='name'>Initials</Label>
              <Input
                id='initials'
                type='text'
                className='w-full'
                placeholder='Enter your initials'
                value={initials}
                onChange={(e) => setInitials(e.target.value)}
              />
            </div>
          </div>
        </div>
        {isLoading ? (
          <Button disabled className='w-full'>
            Please wait
            <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
          </Button>
        ) : (
          <Button
            onClick={handleAccept}
            disabled={!initials.trim() || isLoading}
            className='w-full'
          >
            Sign & Accept
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}
