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
      <div className='border-l-4 border-primary flex items-start p-4 my-1 bg-primary/10 border rounded-md shadow-sm'>
        <div className='flex-shrink-0'>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            className='h-6 w-6 text-primary'
            viewBox='0 0 20 20'
            fill='currentColor'
          >
            <path
              fillRule='evenodd'
              d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-9-4a1 1 0 112 0v2a1 1 0 01-2 0V6zm1 4a1 1 0 00-.993.883L9 11v2a1 1 0 001.993.117L11 13v-2a1 1 0 00-1-1z'
              clipRule='evenodd'
            />
          </svg>
        </div>
        <div className='ml-3'>
          <p className='text-sm font-medium text-primary'>
            Warning
          </p>
          <p className='text-sm text-primary mt-1'>
            Your submission does not meet our quality standards and may be
            flagged for review. Please address the issues below before
            submitting.
          </p>

          <div className='mt-2'>
            <ul className='list-disc pl-5 text-sm text-primary space-y-1'>
              {Object.entries(validationResults)
                .filter(
                  ([key, check]) =>
                    key !== 'isValid' &&
                    typeof check === 'object' &&
                    check.failed
                )
                .map(([key, check]) => (
                  <li key={key}>
                    {typeof check === 'object' && check.message}
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SubmissionValidation
