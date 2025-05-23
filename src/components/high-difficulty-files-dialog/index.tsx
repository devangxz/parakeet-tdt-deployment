'use client'

import { ReloadIcon } from '@radix-ui/react-icons'
import { useState, useEffect } from 'react'

import {
  getHighDifficultyFiles,
  HighDifficultyFile,
} from '@/app/actions/invoice/pending-high-difficulty/get-files'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog'
import { AUDIO_ISSUES } from '@/constants'

interface HighDifficultyFilesDialogProps {
  open: boolean
  onClose: () => void
}

export default function HighDifficultyFilesDialog({
  open,
  onClose,
}: HighDifficultyFilesDialogProps) {
  const [files, setFiles] = useState<HighDifficultyFile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      fetchHighDifficultyFiles()
    }
  }, [open])

  const fetchHighDifficultyFiles = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await getHighDifficultyFiles()
      if (response.success) {
        setFiles(response.files)
      } else {
        setError(response.message || 'Failed to fetch files')
      }
    } catch (err) {
      setError('An error occurred while fetching high difficulty files')
    } finally {
      setLoading(false)
    }
  }

  const formatReasons = (reasons: string) => {
    if (!reasons) return 'No specific reasons provided'

    try {
      const issuesArray = reasons.split(',')
      const formattedHtml = `<ul>${issuesArray
        .map((key) => {
          const issue = AUDIO_ISSUES[key.trim() as keyof typeof AUDIO_ISSUES]
          if (!issue) return ''
          const longText =
            issue.long.charAt(0).toUpperCase() + issue.long.slice(1)
          return `<li>${longText} (eg. ${issue.example})</li>`
        })
        .filter(Boolean) // Remove empty strings
        .join('')}</ul>`

      return formattedHtml
    } catch (error) {
      console.error('Error formatting reasons:', error)
      return reasons // Fallback to original string if formatting fails
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>High Difficulty Files</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className='flex items-center justify-center p-6'>
            <ReloadIcon className='h-6 w-6 animate-spin mr-2' />
            <span>Loading files...</span>
          </div>
        ) : error ? (
          <div className='text-red-500 p-4'>{error}</div>
        ) : files.length === 0 ? (
          <div className='p-4 text-center'>No high difficulty files found</div>
        ) : (
          <div className='divide-y divide-gray-200 max-h-[70vh] overflow-y-auto'>
            {files.map((file) => (
              <div key={file.fileId} className='py-4'>
                <h3 className='font-semibold text-lg mb-1'>{file.filename}</h3>
                <div className='text-sm text-gray-700'>
                  <strong>Reasons:</strong>
                  <div
                    className='mt-1 pl-4'
                    dangerouslySetInnerHTML={{
                      __html: formatReasons(file.reasons),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className='flex justify-end mt-4'>
          <DialogClose asChild>
            <Button variant='secondary' onClick={onClose}>
              Close
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  )
}
