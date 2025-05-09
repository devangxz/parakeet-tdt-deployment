/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { ReloadIcon } from '@radix-ui/react-icons'
import { useEffect, useState } from 'react'

import { getDraftTranscriptAction } from '@/app/actions/file/get-draft-transcript'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

interface DraftTranscriptFileDialogProps {
  open: boolean
  onClose: () => void
  fileId: string
  filename: string
}

const DraftTranscriptFileDialog = ({
  open,
  onClose,
  fileId,
  filename,
}: DraftTranscriptFileDialogProps) => {
  const [transcript, setTranscript] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTranscript = async () => {
      if (!open || !fileId) return

      setIsLoading(true)
      setError(null)

      try {
        const response = await getDraftTranscriptAction(fileId)

        if (response.success) {
          setTranscript(response.transcript || null)
        } else {
          setError(response.message || 'Failed to fetch transcript')
        }
      } catch (err) {
        console.error('Error fetching transcript:', err)
        setError('An error occurred while fetching the transcript')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTranscript()
  }, [open, fileId])

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className='sm:max-w-[70%] max-h-[90vh]'>
        <AlertDialogHeader>
          <AlertDialogTitle>Draft Transcript of {filename}</AlertDialogTitle>
          <AlertDialogDescription className='font-medium'>
            NOTICE <br /> Work-In-Progress Draft <br /> This transcript is not
            yet complete. There may be higher number of mistakes and missing
            sections in this transcript. The draft transcript is provided for
            the purpose of tracking and should not be considered as final. The
            final transcript documents will be provided for download after the
            transcript is delivered and the progress is 100%.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className='py-4'>
          {isLoading ? (
            <div className='flex items-center justify-center py-8'>
              <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
              <span>Loading transcript...</span>
            </div>
          ) : error ? (
            <div className='py-4 text-center'>
              Under processing. Please try again after some time.
            </div>
          ) : transcript ? (
            <>
              <ScrollArea className='h-[400px] rounded-md border p-4'>
                <pre className='whitespace-pre-wrap font-mono text-sm'>
                  {transcript.split('\n').map((line, index) => (
                    <span key={index}>
                      {line}
                      {index < transcript.split('\n').length - 1 && <br />}
                    </span>
                  ))}
                </pre>
              </ScrollArea>
            </>
          ) : (
            <div className='py-4 text-center'>
              Under processing. Please try again after some time.
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default DraftTranscriptFileDialog
