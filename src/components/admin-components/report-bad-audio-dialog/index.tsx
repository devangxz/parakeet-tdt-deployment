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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface DialogProps {
  open: boolean
  onClose: () => void
  fileId: string
}

const reportReasonMap = {
  HIGH_ERROR_RATE: 'High Error Rate',
  INCOMPLETE: 'Incomplete',
  INCORRECT_PARAGRAPH_BREAKS: 'Incorrect Paragraph Breaks',
  DOES_NOT_MATCH_AUDIO: 'Does Not Match Audio',
  HIGH_DIFFICULTY: 'High Difficulty',
  NETWORK_ERROR: 'Network Error',
  NO_SPOKEN_AUDIO: 'No Spoken Audio',
  GUIDELINE_VIOLATIONS: 'Guideline Violations',
  ONLY_BACKGROUND_CONVERSATION: 'Only Background Conversation',
  ONLY_MUSIC: 'Only Music',
  OTHER: 'Other',
}

const ReportBadAudioDialog = ({ open, onClose, fileId }: DialogProps) => {
  const [comments, setComments] = useState('')
  const [loading, setLoading] = useState(false)
  const [reportOption, setReportOption] = useState('HIGH_ERROR_RATE')

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const response = await axios.post(`/api/om/report-bad-audio`, {
        fileId,
        comments: comments,
        reportOption,
      })
      if (response.data.success) {
        const successToastId = toast.success(`Successfully reported bad audio`)
        toast.dismiss(successToastId)
        setLoading(false)
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
        toast.error(`Error reporting bad audio`)
      }
      setLoading(false)
    }
  }
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Report Bad Audio</AlertDialogTitle>
          <AlertDialogDescription>
            <div className='grid items-center gap-1.5 mt-3 mb-5'>
              <Label>Select a reason</Label>
              <Select
                value={reportOption}
                onValueChange={(value) => setReportOption(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select a reason' />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(reportReasonMap).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='grid items-center gap-1.5'>
              <Label>Please enter comments</Label>
              <Textarea
                id='comment'
                className='min-h-32'
                placeholder='Enter your comment here'
                value={comments}
                onChange={(e) => setComments(e.target.value)}
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
              'Report'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default ReportBadAudioDialog
