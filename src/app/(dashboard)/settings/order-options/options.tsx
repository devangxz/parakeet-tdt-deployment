'use client'
import { ReloadIcon } from '@radix-ui/react-icons'
import axios, { AxiosError } from 'axios'
import React, { useState } from 'react'
import { toast } from 'sonner'

import HeadingDescription from '@/components/heading-description'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { DEFAULT_USER_OPTIONS } from '@/constants'
import { mapKeyToMessage } from '@/utils/error-util'

type orderOption = {
  heading: string
  description: string
  orderKey?: string
  controller: (callback: () => void) => void
}

type orderOptoinsType = {
  sif: number
  exd: number
  vb: number
  sub: number
  ts: number
  si: number
  sp: string
  tmp: number
  di: number
}

const defaultInitState = DEFAULT_USER_OPTIONS

const optionsArray: orderOption[] = [
  {
    heading: 'Rush order',
    description:
      'All files are prioritized for completion. Get your files delivered up to 3x faster.',
    orderKey: 'exd',
    controller: (callback: () => void) => callback(),
  },
  {
    heading: 'Strict Verbatim',
    description:
      'Include all utterances (e.g. Mm-hmm, uh-huh, umm, uh, etc.). By default the transcripts are non-strict verbatim and do not include these utterances unless necessary.',
    orderKey: 'vb',
    controller: (callback: () => void) => callback(),
  },
  {
    heading: 'Subtitle File',
    description:
      'A subtitle file will also be provided in WebVTT (.vtt) and SubRip (.srt) formats. It can be used as YouTube caption file and with other video players.',
    orderKey: 'sub',
    controller: (callback: () => void) => callback(),
  },
  {
    heading: 'Audio Time-coding',
    description:
      'The audio timestamp will be added before each paragraph. New paragraphs are started at every change of speaker or at every 3 minutes, whichever is earlier.',
    orderKey: 'ts',
    controller: (callback: () => void) => callback(),
  },
]

const templates = [
  {
    name: 'Scribie Single Line Spaced',
    id: 0,
  },
  {
    name: 'Scribie Double Line Spaced',
    id: 1,
  },
  {
    name: 'Blank Single Line Spaced',
    id: 2,
  },
  {
    name: 'Blank Double Line Spaced',
    id: 3,
  },
]

interface OptionProps {
  message: string
  statusCode: number
  options?: orderOptoinsType
  instructions?: {
    instructions: string | null
  } | null
}

const Page = ({ options }: { options: OptionProps }) => {
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [loadingInstructions, setLoadingInstructions] = useState(false)
  const [orderOptions, setOrderOptions] = useState<orderOptoinsType>(
    options.options || defaultInitState
  )
  const [defaultInstruction, setDefaultInstruction] = useState<string>(
    options.instructions?.instructions || ''
  )
  async function orderOptionsSubmit() {
    setLoadingOptions(true)
    try {
      const formData: Record<string, string | number | boolean> = {}
      formData['sif'] = orderOptions.sif // default
      formData['si'] = orderOptions.si // speaker tracking
      formData['tmp'] = orderOptions.tmp //template
      formData['sp'] = orderOptions.sp // Spelling style
      formData['ts'] = orderOptions.ts // audio time encoding
      formData['exd'] = orderOptions.exd // rush order
      formData['vb'] = orderOptions.vb // strict verbatim
      formData['sub'] = orderOptions.sub // subtitle file
      const response = await axios.post(`/api/user/default-options`, {
        options: formData,
      })
      const message = mapKeyToMessage(response.data.message)
      const successToastId = toast.success(message)
      toast.dismiss(successToastId)
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        const message = mapKeyToMessage(error.response.data.message)
        const errorToastId = toast.error(message)
        toast.dismiss(errorToastId)
      } else {
        toast.error(`Error fetching default settings ${error}`)
      }
    } finally {
      setLoadingOptions(false)
    }
  }
  async function handleDefaultInstruction() {
    setLoadingInstructions(true)
    try {
      const response = await axios.post(`/api/user/default-instructions`, {
        instructions: defaultInstruction,
      })
      const message = mapKeyToMessage(response.data.message)
      const successToastId = toast.success(message)
      toast.dismiss(successToastId)
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        const message = mapKeyToMessage(error.response.data.message)
        const errorToastId = toast.error(message)
        toast.dismiss(errorToastId)
      } else {
        toast.error(`Error fetching default settings ${error}`)
      }
    } finally {
      setLoadingInstructions(false)
    }
  }

  return (
    <div className='w-[80%] space-y-[1.5rem]'>
      <div className='w-[70%] space-y-[1.5rem]'>
        <HeadingDescription
          heading='Human transcript order options'
          description='The following options for human transcript orders can be set. 
These values are used when an invoice is generated and can be changed further on the invoice page. 
Please read the blog post here to learn more about these options.'
        />
        {optionsArray.map((option, index) => (
          <div key={index} className='w-[100%] flex items-center gap-[1.25rem]'>
            {option.orderKey && (
              <Switch
                checked={
                  orderOptions[option.orderKey as keyof orderOptoinsType] == 1
                }
                onCheckedChange={(isChecked) => {
                  setOrderOptions({
                    ...orderOptions,
                    [option.orderKey as keyof orderOptoinsType]: isChecked
                      ? 1
                      : 0,
                  })
                }}
              />
            )}
            <div>
              <div className='font-semibold'>{option.heading}</div>
              <div className='text-gray-600 text-sm not-italic font-normal leading-5'>
                {option.description}
              </div>
            </div>
          </div>
        ))}
      </div>

      <hr />

      <div className='space-y-[2rem]'>
        <div className='w-[100%] flex items-center gap-[1.25rem]'>
          <Switch
            checked={orderOptions.sif === 1}
            onCheckedChange={(isChecked) => {
              setOrderOptions({
                ...orderOptions,
                sif: isChecked ? 1 : 0,
              })
            }}
          />
          <div>
            <div className='font-semibold'>Speaker Tracking</div>
            <div className='text-gray-600 text-sm not-italic font-normal leading-5'>
              The speaker initial will be added before each paragraph. The names
              of speakers, as provided or as spoken in the audio, will be used.
              Speaker 1, Speaker 2 and so on will be used if none are available.
            </div>
          </div>
        </div>
        <div className='space-y-[1rem]'>
          <HeadingDescription heading='Speaker Name Format' />
          <RadioGroup
            onValueChange={(value) =>
              setOrderOptions({ ...orderOptions, si: Number(value) })
            }
            value={orderOptions.si.toString()}
            className='flex gap-[3rem]'
            disabled={orderOptions.sif === 0}
            test-id='speaker-name-format'
          >
            <div className='flex items-center space-x-2'>
              <RadioGroupItem value='0' id='Initials' />
              <Label
                htmlFor='nitials'
                className='text-gray-900 text-sm not-italic font-medium leading-3'
              >
                Initials
              </Label>
            </div>

            <div className='flex items-center space-x-2'>
              <RadioGroupItem value='1' id='Full_names' />
              <Label
                htmlFor='Full_names'
                className='text-gray-900 text-sm not-italic font-medium leading-3'
              >
                Full names
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className='w-[70%]'>
          <HeadingDescription
            heading='Transcript template'
            description='The templates used for formatting the delivery transcript document(s). For custom templates please Contact Support'
          />
          <div className='flex items-center justify-between gap-[3rem] w-[100%]'>
            <Select
              onValueChange={(value) => {
                setOrderOptions({ ...orderOptions, tmp: Number(value) })
              }}
              value={orderOptions.tmp.toString()}
            >
              <SelectTrigger className='w-[40%]'>
                <SelectValue placeholder='Select an option' />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {templates.map((template, index) => (
                    <SelectItem key={index} value={template.id.toString()}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className='space-y-[1rem] flex items-center justify-between'>
          <div className='space-y-[1rem]'>
            <HeadingDescription
              heading='Spelling Type'
              description='The templates used for formatting the delivery transcript document(s).'
            />
            <RadioGroup
              onValueChange={(value) =>
                setOrderOptions({ ...orderOptions, sp: value })
              }
              defaultValue={orderOptions.sp}
              className='flex gap-[3rem]'
              value={orderOptions.sp}
              test-id='spelling-type'
            >
              <div className='flex items-center space-x-2'>
                <RadioGroupItem value='en_US' id='american' />
                <Label
                  htmlFor='american'
                  className='text-gray-900 text-sm not-italic font-medium leading-3'
                >
                  American
                </Label>
              </div>

              <div className='flex items-center space-x-2'>
                <RadioGroupItem value='en_AU' id='australian' />
                <Label
                  htmlFor='australian'
                  className='text-gray-900 text-sm not-italic font-medium leading-3'
                >
                  Australian
                </Label>
              </div>

              <div className='flex items-center space-x-2'>
                <RadioGroupItem value='en_GB' id='british' />
                <Label
                  htmlFor='british'
                  className='text-gray-900 text-sm not-italic font-medium leading-3'
                >
                  British
                </Label>
              </div>

              <div className='flex items-center space-x-2'>
                <RadioGroupItem value='en_CA' id='canadian' />
                <Label
                  htmlFor='canadian'
                  className='text-gray-900 text-sm not-italic font-medium leading-3'
                >
                  Canadian
                </Label>
              </div>
            </RadioGroup>
          </div>
          <div className='my-[1.5rem] flex justify-end'>
            {loadingOptions ? (
              <Button disabled>
                <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                Save
              </Button>
            ) : (
              <Button
                onClick={() => orderOptionsSubmit()}
                className='w-[4rem] h-[2.5rem]'
              >
                Save
              </Button>
            )}
          </div>
        </div>
      </div>

      <hr />

      <div className='w-[100%] space-y-[1rem]'>
        <div className='text-gray-900 text-sm not-italic font-medium leading-5'>
          Default instructions
        </div>
        <div className='flex items-center justify-between'>
          <div>
            <Textarea
              id='myTextArea'
              onChange={(event) => {
                setDefaultInstruction(event.target.value)
              }}
              placeholder='Type your message here.'
              value={defaultInstruction}
              rows={5}
            />
            <div className='text-gray-600 text-sm not-italic font-normal leading-5'>
              Terms, acronyms, keywords, names of places, speaker names etc.
            </div>
          </div>
          <div className='my-[1.5rem]'>
            {loadingInstructions ? (
              <Button disabled>
                <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                Save
              </Button>
            ) : (
              <Button
                onClick={() => handleDefaultInstruction()}
                className='w-[4rem] h-[2.5rem]'
              >
                Save
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Page
