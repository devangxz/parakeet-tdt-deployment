'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface CancellationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string, comment: string) => void
}

const CANCELLATION_REASONS = [
  'Ambient Noise - (e.g. hiss, line noise, static, background music/voices)',
  'Noisy Environment - (e.g. street, bar, restaurant, or other loud noises in background)',
  'Distant Speakers - (e.g. faint, distant voices)',
  'Accented Speakers - (e.g. British, Australian, Indian, Hispanic, any other non-American)',
  'Audio Breaks - (e.g. bad phone line, audio gaps)',
  'Disturbances - (e.g. loud typing sounds, rustling, wind howling, breathing sounds)',
  'Distortion - (e.g. volume distortion, shrill voices, clipping, artifacts)',
  'Unclear Speakers - (e.g. muttering, volume variation, frequent overlaps)',
  'Echo - (e.g. reverberation, same voice can be heard twice)',
  'Quality - (e.g. low sampling/bit rate, bad conference line, recorded off speakers)',
  'Diction - (e.g. slurring, rapid speaking, unnatural pronunciation)',
  'Muffled - (e.g. hidden or obstructed microphone, vintage tapes)',
  'Blank - (e.g. only music, only background conversation, only non-English)',
  'Too Many Speakers - (accurate speaker tracking is too challenging)',
  'Special or Challenging Content - (entails massive research, intelligent inferences, and specialized knowledge)',
  'File is Too Short',
  'File is Too Long',
  'Incorrect Duration - (mismatch in duration)',
  'Incomplete Transcript',
  'Missing Transcript',
  'Have a Sudden Emergency - (I am unable to work on the file due to a sudden emergency)',
  'Too Many Errors - (the transcript has too many mistakes/errors)',
  'Editor Issues - (I am unable to proceed due to Editor issues like lags, shortcuts not working, changes not being saved, etc.)',
  'Unable to Submit - (I cannot submit the file despite applying troubleshooting tips so I canceled it)',
  'Slow Internet - (I suddenly encountered a slow internet connection and I cannot finish the file)',
  'Sudden Power Outage',
]

export function CancellationModal({
  isOpen,
  onClose,
  onConfirm,
}: CancellationModalProps) {
  const [reason, setReason] = useState<string>('')
  const [comment, setComment] = useState<string>('')

  const handleConfirm = () => {
    onConfirm(reason, comment)
    setReason('')
    setComment('')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Cancel Assignment</DialogTitle>
        </DialogHeader>
        <div className='grid gap-4'>
          <Select onValueChange={setReason} value={reason}>
            <SelectTrigger className='w-full'>
              <SelectValue placeholder='Select reason for cancellation' />
            </SelectTrigger>
            <SelectContent className='max-h-[300px]'>
              {CANCELLATION_REASONS.map((reason) => (
                <SelectItem
                  key={reason}
                  value={reason}
                  className='pr-6 whitespace-normal'
                >
                  {reason.length > 85
                    ? `${reason.substring(0, 82)}...`
                    : reason}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            placeholder='Additional comments...'
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className='min-h-[100px]'
          />
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            Close
          </Button>
          <Button
            variant='destructive'
            onClick={handleConfirm}
            disabled={!reason}
          >
            Confirm Cancellation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
