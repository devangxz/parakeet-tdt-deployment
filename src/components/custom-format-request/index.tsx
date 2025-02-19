'use client'
import { ReloadIcon } from '@radix-ui/react-icons'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { toast } from 'sonner'

import { sendCustomFormatRequest } from '@/app/actions/custom-format-request'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface CustomFormatRequestProps {
  open: boolean
  onClose: () => void
}

export function CustomFormatRequestModal({
  open,
  onClose,
}: CustomFormatRequestProps) {
  const { data: session } = useSession()
  const formatOptions = ['Deposition', 'Closed Captioning', 'Other']
  const [selectedOption, setSelectedOption] = useState<string>(formatOptions[0])
  const [customInput, setCustomInput] = useState<string>('')
  const [submitLoading, setSubmitLoading] = useState<boolean>(false)

  const handleSelectChange = (value: string) => {
    setSelectedOption(value)
  }

  const handleSubmit = async () => {
    setSubmitLoading(true)
    try {
      const formattingRequest =
        selectedOption === 'Other' ? customInput : selectedOption
      if (formattingRequest.trim() === '') {
        toast.error('Please provide a valid formatting description.')
        return
      }
      const response = await sendCustomFormatRequest({
        customerEmail: session?.user?.email ?? '',
        customFormatRequest: formattingRequest,
      })
      if (response) {
        toast.success(
          'Your custom formatting request has been submitted. Our support team will get back to you soon.'
        )
        onClose()
      } else {
        toast.error('Submission failed. Please try again.')
      }
    } catch (error) {
      toast.error('Submission failed. Please try again.')
    } finally {
      setSubmitLoading(false)
    }
  }

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Custom Formatting Request</AlertDialogTitle>
          <p className='text-sm text-muted-foreground'>
            Please submit the custom formatting request and our support team
            will get back to you.
          </p>
          <AlertDialogDescription>
            <div className='flex flex-col mt-3'>
              <Label className='font-medium mb-2'>
                Choose a formatting option:
              </Label>
              <Select value={selectedOption} onValueChange={handleSelectChange}>
                <SelectTrigger className='w-[270px]'>
                  <SelectValue placeholder='Select Formatting Option' />
                </SelectTrigger>
                <SelectContent>
                  {formatOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedOption === 'Other' && (
              <div className='flex flex-col mt-5'>
                <Label className='font-medium mb-2'>
                  Please specify your formatting request:
                </Label>
                <Input
                  type='text'
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder='Enter custom formatting details'
                />
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSubmit} disabled={submitLoading}>
            {submitLoading ? (
              <>
                Please wait
                <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
              </>
            ) : (
              'Submit'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
