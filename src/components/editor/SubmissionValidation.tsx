import { AlertCircle } from 'lucide-react'
import React, { useEffect } from 'react'

import { QC_VALIDATION } from '@/constants'

const SubmissionValidation: React.FC<{
  playedPercentage: number
  werPercentage: number
  blankPercentage: number
  setIsQCValidationPassed: (value: boolean) => void
}> = ({
  playedPercentage,
  werPercentage,
  blankPercentage,
  setIsQCValidationPassed,
}) => {
  const audioPlaybackCheck = {
    failed: playedPercentage < QC_VALIDATION.min_audio_playback_percentage,
    message: `Audio file not fully listened to`,
  }

  const werChangesCheck = {
    failed:
      werPercentage < QC_VALIDATION.min_wer_percentage ||
      werPercentage > QC_VALIDATION.max_wer_percentage,
    message:
      werPercentage < QC_VALIDATION.min_wer_percentage
        ? `Few or no changes made to the transcript`
        : `Too many changes detected in the transcript`,
  }

  const blankCheck = {
    failed: blankPercentage > QC_VALIDATION.max_blank_percentage,
    message: `Too many inaudible/blank segments detected in the transcript`,
  }

  const isValid =
    !audioPlaybackCheck.failed && !werChangesCheck.failed && !blankCheck.failed

  useEffect(() => {
    setIsQCValidationPassed(isValid)
  }, [isValid, setIsQCValidationPassed])

  if (isValid) {
    return null
  }

  return (
    <div className='space-y-3 mt-4'>
      <div className='bg-red-50 dark:bg-red-950/20 p-4 rounded-md border border-red-200 dark:border-red-800'>
        <div className='flex items-start gap-2'>
          <div className='text-red-500'>
            <AlertCircle className='h-5 w-5' />
          </div>
          <div>
            <p className='text-sm font-medium text-red-700 dark:text-red-400'>
              Warning
            </p>
            <p className='text-sm text-red-700/90 dark:text-red-400/90 mt-1'>
              Your submission does not meet our quality standards and may be
              flagged for review. Please address the issues below before
              submitting.
            </p>

            <div className='mt-3 border-t border-red-200 dark:border-red-800/50 pt-2'>
              <ul className='list-disc pl-5'>
                {audioPlaybackCheck.failed && (
                  <li className='text-sm text-red-700 dark:text-red-400 py-1'>{audioPlaybackCheck.message}</li>
                )}

                {werChangesCheck.failed && (
                  <li className='text-sm text-red-700 dark:text-red-400 py-1'>{werChangesCheck.message}</li>
                )}

                {blankCheck.failed && (
                  <li className='text-sm text-red-700 dark:text-red-400 py-1'>{blankCheck.message}</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SubmissionValidation
