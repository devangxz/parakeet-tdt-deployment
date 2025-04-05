import {
  ArrowUpIcon,
  Cross1Icon,
  PlusIcon,
  ReloadIcon,
} from '@radix-ui/react-icons'
import { useEffect, useState } from 'react'
import ReactQuill from 'react-quill'
import { toast } from 'sonner'

import { getSpeakerNamesAction } from '@/app/actions/editor/get-speaker-names'
import { updateSpeakerNameAction } from '@/app/actions/editor/update-speaker-name'
import { OrderDetails } from '@/app/editor/[fileId]/page'
import { Button } from '@/components/ui/button'
import { DialogClose } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface SpeakerManagerProps {
  orderDetails: OrderDetails
  quillRef: React.RefObject<ReactQuill> | undefined
  onUpdateSpeakers?: (speakers: Record<string, string>) => Promise<void>
  isDialog?: boolean
}

export default function SpeakerManager({
  orderDetails,
  quillRef,
  onUpdateSpeakers,
  isDialog = false
}: SpeakerManagerProps) {
  const [speakers, setSpeakers] = useState<{
    [key: string]: string
  } | null>(null)
  const [isSpeakerNamesLoading, setIsSpeakerNamesLoading] = useState(false)
  const [isUpdatingSpeakers, setIsUpdatingSpeakers] = useState(false)

  useEffect(() => {
    if (quillRef && quillRef.current) {
      loadSpeakerNames()
    }
  }, [quillRef, orderDetails.fileId])

  const loadSpeakerNames = async () => {
    try {
      setIsSpeakerNamesLoading(true)
      if (quillRef && quillRef.current) {
        const quill = quillRef.current.getEditor()
        const text = quill.getText()
        const speakerRegex = /\d{1,2}:\d{2}:\d{2}\.\d\s+(S\d+):/g
        const speakerOrder: string[] = []
        let match

        // Collect speakers in order of appearance
        while ((match = speakerRegex.exec(text)) !== null) {
          const speaker = match[1]
          if (!speakerOrder.includes(speaker)) {
            speakerOrder.push(speaker)
          }
        }

        const response = await getSpeakerNamesAction(orderDetails.fileId)
        const speakerNamesList = response.data
        const newSpeakerNames: Record<string, string> = {}

        // Map speaker names based on order of appearance
        speakerOrder.forEach((speaker) => {
          const speakerNumber = parseInt(speaker.replace('S', '')) - 1
          // Preserve existing speaker names if they exist
          if (speakers && speakers[speaker]) {
            newSpeakerNames[speaker] = speakers[speaker]
          } else if (
            speakerNamesList &&
            speakerNamesList[speakerNumber] &&
            (speakerNamesList[speakerNumber].fn ||
              speakerNamesList[speakerNumber].ln)
          ) {
            const { fn, ln } = speakerNamesList[speakerNumber]
            newSpeakerNames[speaker] = `${fn} ${ln}`.trim()
          } else {
            newSpeakerNames[speaker] = `Speaker ${speakerNumber + 1}`
          }
        })

        // Add any remaining speakers from the API that weren't in the transcript
        const maxSpeakerNumber = Math.max(
          ...speakerOrder.map((s) => parseInt(s.replace('S', ''))),
          speakerNamesList.length
        )

        for (let i = 1; i <= maxSpeakerNumber; i++) {
          const speaker = `S${i}`
          if (!newSpeakerNames[speaker]) {
            if (speakers && speakers[speaker]) {
              newSpeakerNames[speaker] = speakers[speaker]
            } else if (
              speakerNamesList &&
              speakerNamesList[i - 1] &&
              (speakerNamesList[i - 1].fn || speakerNamesList[i - 1].ln)
            ) {
              const { fn, ln } = speakerNamesList[i - 1]
              newSpeakerNames[speaker] = `${fn} ${ln}`.trim()
            } else {
              newSpeakerNames[speaker] = `Speaker ${i}`
            }
          }
        }

        setSpeakers(newSpeakerNames)
      }
    } catch (error) {
      toast.error('An error occurred while loading speaker names')
    } finally {
      setIsSpeakerNamesLoading(false)
    }
  }

  const handleSpeakerNameChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    key: string
  ) => {
    setSpeakers((prev) => ({ ...prev, [key]: e.target.value }))
  }

  const updateSpeakerName = async () => {
    try {
      if (!speakers) {
        throw new Error('Speaker names cannot be empty')
      }
      setIsUpdatingSpeakers(true)
      
      if (onUpdateSpeakers) {
        await onUpdateSpeakers(speakers)
      } else {
        await updateSpeakerNameAction(orderDetails.fileId, speakers)
        toast.success('Speaker names updated successfully')
      }
    } catch (error) {
      toast.error('Failed to update speaker names')
    } finally {
      setIsUpdatingSpeakers(false)
    }
  }

  const addSpeakerName = async () => {
    if (!speakers) return
    const newKey = `S${Object.keys(speakers).length + 1}`
    setSpeakers((prev) => ({
      ...prev,
      [newKey]: 'Speaker ' + (Object.keys(speakers).length + 1),
    }))
  }

  const handleSwapSpeakers = (currentIndex: number) => {
    if (!speakers || currentIndex === 0) return

    const entries = Object.entries(speakers)
    const currentKey = entries[currentIndex][0]
    const previousKey = entries[currentIndex - 1][0]

    setSpeakers((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        [currentKey]: prev[previousKey],
        [previousKey]: prev[currentKey],
      }
    })
  }

  return (
    <div className={`${isDialog ? '' : 'h-full py-[12px] px-[15px]'} overflow-y-auto`}>
      <div className={`${isDialog ? '' : 'h-full'} flex flex-col gap-4`}>
        {isSpeakerNamesLoading ? (
          <div className='flex items-center justify-center h-32'>
            <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
            <span>Loading speaker names...</span>
          </div>
        ) : (
          <>
            <div className='space-y-4'>
              {speakers &&
                Object.entries(speakers).map(([key, value], index) => (
                  <div
                    key={key}
                    className='flex items-center justify-start space-x-2'
                  >
                    <Label htmlFor={key} className='w-8 text-left'>{key}:</Label>
                    <Input
                      id={key}
                      value={value}
                      onChange={(e) => handleSpeakerNameChange(e, key)}
                      className='flex-1 max-w-md'
                    />
                    <div className='flex space-x-1'>
                      {index > 0 && (
                        <button
                          onClick={() => handleSwapSpeakers(index)}
                          title='Swap with previous speaker'
                          className='p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors text-muted-foreground'
                          type='button'
                        >
                          <ArrowUpIcon className='h-[18px] w-[18px]' />
                        </button>
                      )}
                      {index > 0 && (
                        <button
                          onClick={() => {
                            setSpeakers((prev) => {
                              if (!prev) return prev
                              const newSpeakerNames = { ...prev }
                              delete newSpeakerNames[key]
                              return newSpeakerNames
                            })
                          }}
                          title='Delete Speaker'
                          className='p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors text-red-600'
                          type='button'
                        >
                          <Cross1Icon className='h-4 w-4' />
                        </button>
                      )}
                      {index === Object.entries(speakers).length - 1 && (
                        <button
                          onClick={addSpeakerName}
                          title='Add Speaker'
                          className='p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors text-primary'
                          type='button'
                        >
                          <PlusIcon className='h-5 w-5' />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>

            <div className='bg-secondary/30 p-4 rounded-lg border border-customBorder'>
              <p className='text-sm font-medium mb-2'>
                Please follow the rules below to determine the speaker name, in
                order:
              </p>
              <ol className='list-decimal list-inside text-sm text-muted-foreground space-y-2 ml-2'>
                <li className='pb-1'>
                  The name as spoken in the audio if the customer instruction is
                  present.
                </li>
                <li className='pb-1'>
                  The name as mentioned in the customer instructions.
                </li>
                <li className='pb-1'>
                  If the customer instructions (CI) explicitly stated that we
                  should use the names they listed in the CI instead of the
                  names mentioned in the audio, then that CI should be followed.
                </li>
                <li>
                  Leave blank otherwise. Do <strong>NOT</strong> use
                  &quot;Interviewer/Interviewee&quot; or any other format unless
                  specified explicitly by the customer.
                </li>
              </ol>

              <div className='mt-4'>
                <p className='text-sm font-medium mb-2'>
                  Customer Instructions:
                </p>
                <div className='text-sm text-muted-foreground italic bg-background border border-customBorder p-3 rounded-md max-h-[150px] overflow-y-auto'>
                  {orderDetails.instructions ||
                    'No specific instructions provided.'}
                </div>
              </div>
            </div>

            <div className={`flex gap-x-2 justify-end ${!isDialog && 'pb-[12px]'}`}>
              {isDialog && (
                <DialogClose asChild>
                  <Button variant='outline'>Close</Button>
                </DialogClose>
              )}
              <Button
                onClick={updateSpeakerName}
                className='px-4'
                disabled={isUpdatingSpeakers}
              >
                {isUpdatingSpeakers ? (
                  <>
                    <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                    Update Speaker Names
                  </>
                ) : (
                  'Update Speaker Names'
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
