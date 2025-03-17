'use client'

import { ReloadIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import { toast } from 'sonner'

import { acceptScreenFile } from '@/app/actions/om/accept-screen-file'
import { rejectScreenFile } from '@/app/actions/om/reject-screen-file'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface DialogProps {
  open: boolean
  onClose: () => void
  orderId: string
  isAccept: boolean
  refetch: () => void
}

const REJECTION_REASONS = [
  {
    id: 'ambient_noise',
    label: 'Ambient Noise (eg. hiss, line noise, static)',
  },
  {
    id: 'noisy_environment',
    label:
      'Noisy Environment (eg. street, bar, restaurant or other loud noises in background)',
  },
  {
    id: 'distant_speakers',
    label: 'Distant Speakers (eg. faint, distant voices)',
  },
  {
    id: 'accented_speakers',
    label:
      'Accented Speakers (eg. British, Australian, Indian, Hispanic, any other non-American)',
  },
  {
    id: 'audio_breaks',
    label: 'Audio Breaks (eg. bad phone line, audio gaps)',
  },
  {
    id: 'disturbances',
    label:
      'Disturbances (eg. loud typing sounds, rustling, wind howling, breathing sounds)',
  },
  {
    id: 'distortion',
    label: 'Distortion (eg. volume distortion, shrill voices, clipping)',
  },
  {
    id: 'unclear_speakers',
    label:
      'Unclear Speakers (eg. muttering, volume variation, frequent overlaps)',
  },
  {
    id: 'echo',
    label: 'Echo (eg. reverberation, same voice can be heard twice)',
  },
  {
    id: 'quality',
    label:
      'Quality (eg. low sampling/bit rate, bad conference line, recorded off speakers)',
  },
  {
    id: 'diction',
    label: 'Diction (eg. slurring, rapid speaking, unnatural pronunciation)',
  },
  {
    id: 'muffled',
    label: 'Muffled (eg. hidden or obstructed microphone, vintage tapes)',
  },
  {
    id: 'blank',
    label:
      'Blank (eg. only music, only background conversation, only non-English)',
  },
]

const AcceptRejectScreenFileDialog = ({
  open,
  onClose,
  orderId,
  isAccept,
  refetch,
}: DialogProps) => {
  const [loading, setLoading] = useState(false)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [comment, setComment] = useState('')

  const handleCheckboxChange = (
    checked: string | boolean,
    item: { id: string; label?: string }
  ) => {
    setSelectedItems((prevSelectedItems) =>
      checked
        ? [...prevSelectedItems, item.id]
        : prevSelectedItems.filter((id) => id !== item.id)
    )
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      if (isAccept) {
        const result = await acceptScreenFile(Number(orderId))
        if (result.success) {
          const successToastId = toast.success(
            `Successfully accepted screen file`
          )
          toast.dismiss(successToastId)
          refetch()
          onClose()
        } else {
          toast.error(result.message)
        }
      } else {
        // Validate rejection reasons if rejecting
        if (selectedItems.length === 0) {
          toast.error('Please select at least one reason for rejection')
          setLoading(false)
          return
        }

        const result = await rejectScreenFile({
          orderId: Number(orderId),
          reasons: selectedItems.join(','),
          comment,
        })
        if (result.success) {
          const successToastId = toast.success(
            `Successfully rejected screen file`
          )
          toast.dismiss(successToastId)
          refetch()
          onClose()
        } else {
          toast.error(result.message)
        }
      }
    } catch (error) {
      toast.error(`Error ${isAccept ? 'accepting' : 'rejecting'} screen file`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className={isAccept ? '' : 'sm:max-w-[792px]'}>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isAccept ? 'Accept Screen File' : 'Reject Screen File'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isAccept ? (
              <div className='grid items-center gap-1.5'>
                <Label>Are you sure you want to accept this screen file?</Label>
              </div>
            ) : (
              <>
                <div className='grid items-center gap-1.5'>
                  <Label>
                    Please select the reasons for rejecting this file
                  </Label>
                </div>
                <p className='font-medium text-lg mt-3'>Rejection Reasons</p>
                {REJECTION_REASONS.map((item) => (
                  <div className='items-top flex space-x-2 mt-3' key={item.id}>
                    <Checkbox
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={(checked) =>
                        handleCheckboxChange(checked, item)
                      }
                    />
                    <div className='grid gap-1.5 leading-none'>
                      <label
                        htmlFor={item.id}
                        className='text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                      >
                        {item.label}
                      </label>
                    </div>
                  </div>
                ))}
                <div className='grid items-center gap-1.5 mt-5'>
                  <Label>Additional Comments</Label>
                  <Textarea
                    placeholder='Additional comments...'
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className='min-h-[100px]'
                  />
                </div>
              </>
            )}
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
              'Accept'
            ) : (
              'Reject'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default AcceptRejectScreenFileDialog
