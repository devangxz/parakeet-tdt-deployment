import { AlertCircle } from 'lucide-react'
import React, { useEffect, useMemo } from 'react'

import { QC_VALIDATION } from '@/constants'

const VALIDATION_MESSAGES = {
  AUDIO_PLAYBACK: 'Audio file not fully listened to',
  FEW_CHANGES: 'Few or no changes made to the transcript',
  MANY_CHANGES: 'Too many changes detected in the transcript',
  BLANK_SEGMENTS:
    'Too many inaudible/blank segments detected in the transcript',
  EDIT_LISTEN_CORRELATION:
    "Edits don't align with sections where audio was carefully listened to",
  SPEAKER_CHANGES: 'Too many speaker changes detected in the transcript',
}

const SubmissionValidation: React.FC<{
  playedPercentage: number
  werPercentage: number
  blankPercentage: number
  editListenCorrelationPercentage: number
  speakerChangePercentage: number
  setIsQCValidationPassed: (value: boolean) => void
}> = ({
  playedPercentage,
  werPercentage,
  blankPercentage,
  editListenCorrelationPercentage,
  speakerChangePercentage,
  setIsQCValidationPassed,
}) => {
  const validationResults = useMemo(() => {
    const audioPlaybackCheck = {
      failed: playedPercentage < QC_VALIDATION.min_audio_playback_percentage,
      message: VALIDATION_MESSAGES.AUDIO_PLAYBACK,
    }

    const werChangesCheck = {
      failed:
        werPercentage < QC_VALIDATION.min_wer_percentage ||
        werPercentage > QC_VALIDATION.max_wer_percentage,
      message:
        werPercentage < QC_VALIDATION.min_wer_percentage
          ? VALIDATION_MESSAGES.FEW_CHANGES
          : VALIDATION_MESSAGES.MANY_CHANGES,
    }

    const blankCheck = {
      failed: blankPercentage > QC_VALIDATION.max_blank_percentage,
      message: VALIDATION_MESSAGES.BLANK_SEGMENTS,
    }

    const editListenCorrelationCheck = {
      failed:
        editListenCorrelationPercentage <
        QC_VALIDATION.min_edit_listen_correlation_percentage,
      message: VALIDATION_MESSAGES.EDIT_LISTEN_CORRELATION,
    }

    const speakerChangeCheck = {
      failed:
        speakerChangePercentage > QC_VALIDATION.max_speaker_change_percentage,
      message: VALIDATION_MESSAGES.SPEAKER_CHANGES,
    }

    const isValid =
      !audioPlaybackCheck.failed &&
      !werChangesCheck.failed &&
      !blankCheck.failed &&
      !editListenCorrelationCheck.failed &&
      !speakerChangeCheck.failed

    return {
      audioPlaybackCheck,
      werChangesCheck,
      blankCheck,
      editListenCorrelationCheck,
      speakerChangeCheck,
      isValid,
    }
  }, [
    playedPercentage,
    werPercentage,
    blankPercentage,
    editListenCorrelationPercentage,
    speakerChangePercentage,
  ])

  useEffect(() => {
    setIsQCValidationPassed(validationResults.isValid)
  }, [validationResults.isValid, setIsQCValidationPassed])

  if (validationResults.isValid) {
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
                {Object.entries(validationResults)
                  .filter(
                    ([key, check]) =>
                      key !== 'isValid' &&
                      typeof check === 'object' &&
                      check.failed
                  )
                  .map(([key, check]) => (
                    <li
                      key={key}
                      className='text-sm text-red-700 dark:text-red-400 py-1'
                    >
                      {typeof check === 'object' && check.message}
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SubmissionValidation
