import { ReloadIcon } from '@radix-ui/react-icons'
import axios, { AxiosError } from 'axios'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface DialogProps {
  open: boolean
  onClose: () => void
  orderId: string
  refetch: () => void
}

const items = [
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

const FlagHighDifficulyDialog = ({
  open,
  onClose,
  orderId,
  refetch,
}: DialogProps) => {
  const [loading, setLoading] = useState(false)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [formData, setFormData] = useState({
    rate: 0.5,
    delayPeriod: 1,
    refundTrigger: 3,
  })

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
    if (selectedItems.length === 0) {
      toast.error('Please select atleast one audio issue')
      return
    }
    setLoading(true)
    try {
      const response = await axios.post(`/api/om/flag-high-difficulty`, {
        orderId,
        issues: selectedItems.join(','),
        rate: formData.rate,
        delayPeriod: formData.delayPeriod,
        refundTrigger: formData.refundTrigger,
      })
      if (response.data.success) {
        const successToastId = toast.success(
          `Successfully flagged file as high difficulty`
        )
        toast.dismiss(successToastId)
        setLoading(false)
        refetch()
        onClose()
      } else {
        toast.error(response.data.message)
        setLoading(false)
      }
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        const errorToastId = toast.error(error.response?.data?.s)
        toast.dismiss(errorToastId)
      } else {
        toast.error(`Error flagging file as high difficulty`)
      }
      setLoading(false)
    }
  }
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className='sm:max-w-[792px]'>
        <AlertDialogHeader>
          <AlertDialogTitle>Flag High Difficulty</AlertDialogTitle>
          <AlertDialogDescription>
            <div className='grid items-center gap-1.5'>
              <Label>
                Please check the audio issues which apply so that file can be
                returned or charged extra
              </Label>
            </div>
            <p className='font-medium text-lg mt-3'>Audio Issues</p>
            {items.map((item) => (
              <div className='items-top flex space-x-2 mt-3' key={item.id}>
                <Checkbox
                  checked={selectedItems.includes(item.id)}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange(checked, item)
                  }
                />
                <div className='grid gap-1.5 leading-none'>
                  <label
                    htmlFor='terms1'
                    className='text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                  >
                    {item.label}
                  </label>
                </div>
              </div>
            ))}
            <div className='grid items-center gap-1.5 mt-5'>
              <Label>Additional Charge Rate (per audio hour)</Label>
              <Input
                value={formData.rate}
                type='number'
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    rate: parseFloat(event.target.value),
                  })
                }
                placeholder='Additional Rate'
              />
            </div>
            <div className='grid items-center gap-1.5 mt-5'>
              <Label>Delay Period</Label>
              <Select
                defaultValue={formData.delayPeriod.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, delayPeriod: Number(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='Delay Period' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='1'>1 week</SelectItem>
                  <SelectItem value='2'>2 week</SelectItem>
                  <SelectItem value='3'>3 week</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='grid items-center gap-1.5 mt-5'>
              <Label>Refund Trigger</Label>
              <Input
                value={formData.refundTrigger}
                type='number'
                readOnly
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    refundTrigger: parseFloat(event.target.value),
                  })
                }
                placeholder='Additional Rate'
              />
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
            ) : (
              'Flag'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default FlagHighDifficulyDialog
