'use client'

import { ReloadIcon } from '@radix-ui/react-icons'
import axios, { AxiosError } from 'axios'
import { useState, useEffect } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface TrimFileModalProps {
  open: boolean
  onClose: () => void
  fileId: string
  endDuration: number
  refetch: () => void
}

const TrimFileModal = ({
  open,
  onClose,
  fileId,
  endDuration,
  refetch,
}: TrimFileModalProps) => {
  const [loading, setLoading] = useState(false)
  const [startTime, setStartTime] = useState('00:00:00')
  const [endTime, setEndTime] = useState('')

  useEffect(() => {
    // Convert endDuration (in seconds) to HH:MM:SS format
    const hours = Math.floor(endDuration / 3600)
    const minutes = Math.floor((endDuration % 3600) / 60)
    const seconds = endDuration % 60
    setEndTime(
      `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    )
  }, [endDuration])

  const validateTime = (time: string): boolean => {
    const timeRegex = /^(?:(?:([01]?\d|2[0-3]):)?([0-5]?\d):)?([0-5]?\d)$/
    return timeRegex.test(time)
  }

  const timeToSeconds = (time: string): number => {
    const [hours, minutes, seconds] = time.split(':').map(Number)
    return hours * 3600 + minutes * 60 + seconds
  }

  const handleSubmit = async () => {
    if (!validateTime(startTime) || !validateTime(endTime)) {
      toast.error('Please enter valid time formats (HH:MM:SS)')
      return
    }

    const startSeconds = timeToSeconds(startTime)
    const endSeconds = timeToSeconds(endTime)

    if (startSeconds >= endSeconds) {
      toast.error('Start time must be before end time')
      return
    }

    if (endSeconds > endDuration) {
      toast.error(
        `End time cannot exceed the file duration of ${endDuration} seconds`
      )
      return
    }

    setLoading(true)
    try {
      const response = await axios.post('/api/file/trim', {
        fileId,
        startTime: startSeconds,
        endTime: endSeconds,
      })
      if (response.data.success) {
        toast.success('Successfully trimmed audio file')
        setLoading(false)
        refetch()
        onClose()
      } else {
        toast.error(response.data.message)
        setLoading(false)
      }
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        toast.error(error.response.data.message)
      } else {
        toast.error('Error trimming audio file')
      }
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Trim Audio</AlertDialogTitle>
          <p>Please enter the start and end timestamp for the trim</p>
          <AlertDialogDescription>
            <div className='grid gap-4 mt-3'>
              <div className='grid gap-2'>
                <Label htmlFor='startTime'>Start Timestamp (HH:MM:SS)</Label>
                <Input
                  id='startTime'
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder='00:00:00'
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='endTime'>End Timestamp (HH:MM:SS)</Label>
                <Input
                  id='endTime'
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  placeholder='00:00:00'
                />
              </div>
            </div>
            <p className='text-sm text-gray-500 mt-5'>
              Note: A new file will be created containing the specified time
              range. The original file will not be modified.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                Trimming
                <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
              </>
            ) : (
              'Trim Audio'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default TrimFileModal
