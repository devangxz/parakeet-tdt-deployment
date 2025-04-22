/* eslint-disable react/no-unescaped-entities */
'use client'

import { ChevronDown, ChevronUp, Pencil, X, Check } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'
import { toast } from 'sonner'

import { ServicesInterface } from './types'
import { OrderOptions } from '@/app/(dashboard)/payments/invoice/[invoice_id]/components/order-options'
import { updateSpecialInstructions } from '@/app/actions/invoice/update-special-instructions'
import { updateFreeOrderOptionsAction } from '@/app/actions/order/update-free-order-options'
import { updateOrderOptions } from '@/app/actions/order/update-order-options'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  FREE_PRICE,
  RUSH_ORDER_PRICE,
  STRICT_VERBATIUM_PRICE,
} from '@/constants'

interface Props {
  services: ServicesInterface
  invoiceId: string
}

interface OrderOption {
  id: string
  name: string
  enabled: boolean
  rate: number
  description: string
  disable_toggle?: boolean
}

export function Services({ services, invoiceId }: Props) {
  const [isOpen, setIsOpen] = React.useState(true)
  const [speakerFormatOpen, setSpeakerFormatOpen] = React.useState(false)
  const [templateOpen, setTemplateOpen] = React.useState(false)
  const [spellingOpen, setSpellingOpen] = React.useState(false)

  const [isEditingInstructions, setIsEditingInstructions] =
    React.useState(false)
  const [instructions, setInstructions] = React.useState(
    services.specialInstructions ?? ''
  )
  const [isSaving, setIsSaving] = React.useState(false)

  const serviceOptions = services.orderOptions
    ? services.orderOptions.split(', ')
    : []

  const [options, setOptions] = React.useState<OrderOption[]>([
    {
      id: 'exd',
      name: 'Rush hour',
      enabled: serviceOptions.includes('Rush hour'),
      rate: RUSH_ORDER_PRICE,
      description: `All files are prioritised for completion. Get your files delivered up to
        3x faster. Files exceeding a duration of 2 hours will require more than
        12 hours to process. The lengthier the file, the longer is the
        turnaround time. Also, files with audio issues may be delayed.`,
      disable_toggle: true,
    },
    {
      id: 'vb',
      name: 'Strict verbatim',
      enabled: serviceOptions.includes('Strict verbatim'),
      rate: STRICT_VERBATIUM_PRICE,
      description: `Include all utterances (e.g. Mm-hmm, uh-huh, umm, uh, etc.). By default the transcripts are non-strict verbatim and do not include these utterances unless necessary.`,
      disable_toggle: true,
    },
    {
      id: 'ts',
      name: 'Audio time coding',
      enabled: serviceOptions.includes('Audio time coding'),
      rate: FREE_PRICE,
      description: `The audio timestamp will be added before each paragraph. New paragraphs are started at every change of speaker or at every 3 minutes, whichever is earlier.`,
    },
    {
      id: 'sub',
      name: 'Subtitle file',
      enabled: serviceOptions.includes('Subtitle file'),
      rate: FREE_PRICE,
      description: `A subtitle file will also be provided in WebVTT (.vtt) and SubRip (.srt) formats. It can be used as YouTube caption file and with other video players.`,
    },
    {
      id: 'sif',
      name: 'Speaker tracking',
      enabled: serviceOptions.includes('Speaker Tracking'),
      rate: FREE_PRICE,
      description: `The speaker initial will be added before each paragraph. The names of speakers, as provided or as spoken in the audio, will be used. Speaker 1, Speaker 2 and so on will be used if none are available.`,
    },
  ])

  const [speakerNameFormat, setSpeakerNameFormat] = React.useState(
    services.speakerNameFormat.toString()
  )

  const [spellingStyle, setSpellingStyle] = React.useState(
    services.spellingStyle || 'en_US'
  )

  const [transcriptTemplate, setTranscriptTemplate] = React.useState(
    services.transcriptTemplate || '0'
  )

  const handleSaveInstructions = async () => {
    if (!invoiceId) return

    setIsSaving(true)
    try {
      const result = await updateSpecialInstructions({
        invoiceId,
        instructions,
      })

      if (result.success) {
        toast.success('Special instructions updated successfully')
        setIsEditingInstructions(false)
      } else {
        toast.error(result.message || 'Failed to update special instructions')
      }
    } catch (error) {
      toast.error('An error occurred while updating special instructions')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setInstructions(services.specialInstructions)
    setIsEditingInstructions(false)
  }

  const handleToggleOption = async (index: number, isEnabled: boolean) => {
    const updatedOptions = [...options]
    updatedOptions[index].enabled = isEnabled
    setOptions(updatedOptions)

    try {
      const response = await updateOrderOptions(
        invoiceId,
        updatedOptions[index].id,
        isEnabled ? '1' : '0'
      )

      if (response.success) {
        const tId = toast.success(
          `Successfully ${isEnabled ? 'Enabled' : 'Disabled'} ${
            updatedOptions[index].name
          } option`
        )
        toast.dismiss(tId)
      } else {
        toast.error(`Failed to update order option`)
      }
    } catch (error) {
      toast.error(`Failed to update order option`)
    }
  }

  const updateFreeOrderOptions = async (
    optionId: string,
    value: string,
    name: string
  ) => {
    try {
      const response = await updateFreeOrderOptionsAction(
        invoiceId,
        optionId,
        value
      )

      if (response.success) {
        const tId = toast.success(`Successfully updated ${name} format`)
        toast.dismiss(tId)
      } else {
        toast.error(`Failed to update order option`)
      }
    } catch (error) {
      toast.error(`Failed to update order option`)
    }
  }

  const handleSpeakerNameFormatChange = (value: string) => {
    setSpeakerNameFormat(value)
    updateFreeOrderOptions('si', value, 'speaker name format')
  }

  const handleSpellingStyleChange = (value: string) => {
    setSpellingStyle(value)
    updateFreeOrderOptions('sp', value, 'spelling style')
  }

  const handleTemplateChange = (value: string) => {
    setTranscriptTemplate(value)
    updateFreeOrderOptions('tmp', value, 'transcript template')
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className='mb-6 mr-5'>
      <div className='flex justify-between flex-wrap'>
        <div className='flex items-center gap-2'>
          <div className='text-md font-medium'>Services</div>
        </div>
        <CollapsibleTrigger>
          {isOpen ? (
            <ChevronUp className='h-4 w-4 text-black cursor-pointer' />
          ) : (
            <ChevronDown className='h-4 w-4 text-black cursor-pointer' />
          )}
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className='mt-3'>
        <ScrollArea className='max-h-[70vh]'>
          {options.map((option, index) => (
            <OrderOptions
              id={option.id}
              key={index}
              name={option.name}
              isEnabled={option.enabled}
              rate={option.rate}
              onEnabledChange={(isEnabled) =>
                handleToggleOption(index, isEnabled)
              }
              description={option.description}
              addMargin={false}
              disableToggle={option.disable_toggle ?? false}
            />
          ))}

          <div className='flex-col lg:flex lg:flex-row justify-between mt-6'>
            <Collapsible
              open={speakerFormatOpen}
              onOpenChange={setSpeakerFormatOpen}
              className='mb-6 mr-5'
            >
              <div className='flex justify-between flex-wrap'>
                <div className='flex items-center gap-2'>
                  <div className='text-md font-medium'>Speaker name format</div>
                  <CollapsibleTrigger>
                    {speakerFormatOpen ? (
                      <ChevronUp className='h-4 w-4 cursor-pointer' />
                    ) : (
                      <ChevronDown className='h-4 w-4 cursor-pointer' />
                    )}
                  </CollapsibleTrigger>
                </div>
              </div>
              <CollapsibleContent className='mt-3 font-normal text-sm text-muted-foreground'>
                Choose how speaker names appear in the transcript. Initials show
                only the first letters (e.g., "JD:"), while full names show the
                complete name.
              </CollapsibleContent>
            </Collapsible>
            <div className='text-md font-normal mt-5 lg:mt-1'>
              <RadioGroup
                value={speakerNameFormat}
                onValueChange={handleSpeakerNameFormatChange}
                className='flex gap-10'
              >
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='0' id='initials' />
                  <Label htmlFor='initials'>Initials</Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='1' id='fullnames' />
                  <Label htmlFor='fullnames'>Full names</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <div className='flex-col lg:flex lg:flex-row justify-between mt-6'>
            <Collapsible
              open={templateOpen}
              onOpenChange={setTemplateOpen}
              className='mb-6 mr-5'
            >
              <div className='flex justify-between flex-wrap'>
                <div className='flex items-center gap-2'>
                  <div className='text-md font-medium'>Transcript template</div>
                  <CollapsibleTrigger>
                    {templateOpen ? (
                      <ChevronUp className='h-4 w-4 cursor-pointer' />
                    ) : (
                      <ChevronDown className='h-4 w-4 cursor-pointer' />
                    )}
                  </CollapsibleTrigger>
                </div>
              </div>
              <CollapsibleContent className='mt-3 font-normal text-sm text-muted-foreground'>
                The templates used for formatting the delivery transcript
                document(s). For custom templates please{' '}
                <Link href='/contact' className='text-primary'>
                  Contact Support
                </Link>
              </CollapsibleContent>
            </Collapsible>
            <div className='text-md font-normal mt-5 lg:mt-2'>
              <Select
                value={transcriptTemplate}
                onValueChange={handleTemplateChange}
              >
                <SelectTrigger className='w-[220px]'>
                  <SelectValue placeholder='Template' />
                </SelectTrigger>
                <SelectContent>
                  {services.templates.map((template) => (
                    <SelectItem
                      key={template.id}
                      value={template.id.toString()}
                    >
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='flex-col lg:flex lg:flex-row justify-between mt-6'>
            <Collapsible
              open={spellingOpen}
              onOpenChange={setSpellingOpen}
              className='mb-6 mr-5'
            >
              <div className='flex justify-between flex-wrap'>
                <div className='flex items-center gap-2'>
                  <div className='text-md font-medium'>Spelling style</div>
                  <CollapsibleTrigger>
                    {spellingOpen ? (
                      <ChevronUp className='h-4 w-4 cursor-pointer' />
                    ) : (
                      <ChevronDown className='h-4 w-4 cursor-pointer' />
                    )}
                  </CollapsibleTrigger>
                </div>
              </div>
              <CollapsibleContent className='mt-3 font-normal text-sm text-muted-foreground'>
                The spelling style specifies the dictionary used for
                spellchecks. Please{' '}
                <Link href='/' className='text-primary'>
                  contact support
                </Link>{' '}
                for more options.
              </CollapsibleContent>
            </Collapsible>
            <div className='text-md font-normal mt-5 lg:mt-2'>
              <RadioGroup
                value={spellingStyle}
                onValueChange={handleSpellingStyleChange}
                className='flex gap-10'
              >
                <div>
                  <div className='flex items-center space-x-2'>
                    <RadioGroupItem value='en_US' id='en_US' />
                    <Label htmlFor='en_US'>American</Label>
                  </div>
                  <div className='flex items-center space-x-2 mt-5'>
                    <RadioGroupItem value='en_GB' id='en_GB' />
                    <Label htmlFor='en_GB'>British</Label>
                  </div>
                </div>
                <div>
                  <div className='flex items-center space-x-2'>
                    <RadioGroupItem value='en_AU' id='en_AU' />
                    <Label htmlFor='en_AU'>Australian</Label>
                  </div>
                  <div className='flex items-center space-x-2 mt-5'>
                    <RadioGroupItem value='en_CA' id='en_CA' />
                    <Label htmlFor='en_CA'>Canadian</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>
          </div>

          <div className='border rounded-md p-4 mt-6'>
            <div className='flex justify-between items-center'>
              <div className='font-medium'>Special instructions</div>
              {!isEditingInstructions ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => setIsEditingInstructions(true)}
                        className='h-8 px-2'
                      >
                        <Pencil className='h-4 w-4' />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit instructions</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <div className='flex space-x-2'>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={handleCancelEdit}
                          className='h-8 px-2'
                          disabled={isSaving}
                        >
                          <X className='h-4 w-4 text-destructive' />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Cancel editing</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={handleSaveInstructions}
                          className='h-8 px-2'
                          disabled={isSaving}
                        >
                          <Check className='h-4 w-4 text-primary' />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Save instructions</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>
            {!isEditingInstructions ? (
              <span className='text-sm font-normal block mt-2 whitespace-pre-line'>
                {instructions || 'No special instructions provided.'}
              </span>
            ) : (
              <Textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder='Enter special instructions here'
                className='mt-2'
                rows={4}
                disabled={isSaving}
              />
            )}
            <div className='text-sm text-muted-foreground mt-2'>
              Please enter special instructions, terms, acronyms, keywords,
              names of places, speaker names, etc.
            </div>
          </div>
        </ScrollArea>
      </CollapsibleContent>
    </Collapsible>
  )
}
