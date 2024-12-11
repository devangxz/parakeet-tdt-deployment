'use client'
import { ReloadIcon } from '@radix-ui/react-icons'
import { useSession } from 'next-auth/react'
import React, { useState } from 'react'
import { toast } from 'sonner'

import { saveDefaultPreferences } from '@/app/actions/user/default-preferences'
import HeadingDescription from '@/components/heading-description'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { CustomerRoles } from '@/types/user'
import { mapKeyToMessage } from '@/utils/error-util'

type preferencesOption = {
  heading: string
  description: string
  controller: (callback: () => void) => void
  orderKey: string
}

type cutomerPreferenceOptions = {
  ccStored: boolean
  transcriptDelivered: boolean
  transcriptOrder: boolean
  transcriptCancelled: boolean
  transcriptRefund: boolean
  newsletter: boolean
  teamMemberWhoOrdered: boolean
}

type transcriberPreferecesOptoinsType = {
  newFilesAvailability: boolean
  fileAssignment: boolean
  fileSubmission: boolean
  earningsCredit: boolean
  withdrawalRequest: boolean
  newsletter: boolean
}

type preferecesOptoinsType =
  | cutomerPreferenceOptions
  | transcriberPreferecesOptoinsType

const customerPreferences: preferencesOption[] = [
  {
    heading: 'Payment Method Added',
    description: 'Sent whenever you or your team member add a payment method.',
    controller: (callback: () => void) => callback(),
    orderKey: 'ccStored',
  },
  {
    heading: 'Transcript Order Confirmation',
    description:
      'Whenever you or your team member place a human transcript order.',
    controller: (callback: () => void) => callback(),
    orderKey: 'transcriptDelivered',
  },
  {
    heading: 'Transcript Order Processed',
    description: 'Whenever a human transcript order is delivered.',
    controller: (callback: () => void) => callback(),
    orderKey: 'transcriptOrder',
  },
  {
    heading: 'Transcript Order Cancelled',
    description:
      'Whenever you or your team member cancel a human transcript order.',
    controller: (callback: () => void) => callback(),
    orderKey: 'transcriptCancelled',
  },
  {
    heading: 'Transcript Order Refund',
    description: 'Whenever a refund is issued for a human or automated order.',
    controller: (callback: () => void) => callback(),
    orderKey: 'transcriptRefund',
  },
  {
    heading: 'News and Announcements',
    description: 'Newsletter sent once in every 2-3 months.',
    controller: (callback: () => void) => callback(),
    orderKey: 'newsletter',
  },
]

const transcriberPreferences: preferencesOption[] = [
  {
    heading: 'New files available',
    description: 'Whenever you or your team member add a payment method',
    controller: (callback: () => void) => callback(),
    orderKey: 'newFilesAvailability',
  },
  {
    heading: 'File assignment',
    description:
      'Whenever you or your team member place a human transcript order',
    controller: (callback: () => void) => callback(),
    orderKey: 'fileAssignment',
  },
  {
    heading: 'File submission',
    description: 'Whenever a human transcript order is delivered',
    controller: (callback: () => void) => callback(),
    orderKey: 'fileSubmission',
  },
  {
    heading: 'Earnings Credit',
    description:
      'Whenever you or your team member cancel a human transcript order',
    controller: (callback: () => void) => callback(),
    orderKey: 'earningsCredit',
  },
  {
    heading: 'Withdrawal Request',
    description: 'Whenever a refund is issued for a human or automated order',
    controller: (callback: () => void) => callback(),
    orderKey: 'withdrawalRequest',
  },
  {
    heading: 'News and Announcements',
    description: 'Newsletter sent once in every 2-3 months',
    controller: (callback: () => void) => callback(),
    orderKey: 'newsletter',
  },
]

const defaultInitState = {
  ccStored: false, //payment method
  transcriptDelivered: false, //transcript order confirmation
  transcriptOrder: false, //transcript order processes
  transcriptCancelled: false, //transcript order cancelled
  transcriptRefund: false, //transcript order refund
  newsletter: false, //newsleter
  teamMemberWhoOrdered: false,
  newFilesAvailability: false,
  fileAssignment: false,
  fileSubmission: false,
  earningsCredit: false,
  withdrawalRequest: false,
  n: 10,
}

export interface PreferencesResponse {
  message: string
  statusCode: number
  preferences?: {
    id: number
    userId: number
    transcriptOrder: boolean
    ccStored: boolean
    transcriptDelivered: boolean
    transcriptCancelled: boolean
    transcriptRefund: boolean
    newsletter: boolean
    teamMemberWhoOrdered: boolean
    newFilesAvailability?: boolean
    fileAssignment?: boolean
    fileSubmission?: boolean
    earningsCredit?: boolean
    withdrawalRequest?: boolean
  }
  recordsPerPage?: number
}

const Page = ({ data }: { data: PreferencesResponse }) => {
  const [loading, setLoading] = useState(false)
  const [preferencesOptions, setPreferencesOptions] =
    useState<preferecesOptoinsType>(data?.preferences || defaultInitState)
  const [recordsPerPage, setRecordsPerPage] = useState<number>(
    data?.recordsPerPage || 5
  )
  const { data: session } = useSession()

  const preferences: preferencesOption[] = []
  const customerRoles = Object.values(CustomerRoles)
  if (customerRoles.includes(session?.user?.role as string)) {
    preferences.push(...customerPreferences)
    if (session?.user?.internalTeamUserId) {
      preferences.push({
        heading: 'Notify Only the Team Member Who Ordered',
        description:
          'When enabled, only the team member who placed the order will be sent the automated emails checked above. When disabled, all members of the team will be sent the email notifications enabled above.',
        controller: (callback: () => void) => callback(),
        orderKey: 'teamMemberWhoOrdered',
      })
    }
  } else {
    preferences.push(...transcriberPreferences)
  }

  async function handlePreferences() {
    setLoading(true)
    try {
      const formData: Record<string, string | number | boolean> = {}
      const keys = ['newsletter']
      if (customerRoles.includes(session?.user?.role as string)) {
        keys.push(
          'ccStored',
          'transcriptDelivered',
          'transcriptOrder',
          'transcriptCancelled',
          'transcriptRefund',
          'teamMemberWhoOrdered'
        )
      } else {
        keys.push(
          'newFilesAvailability',
          'fileAssignment',
          'fileSubmission',
          'earningsCredit',
          'withdrawalRequest'
        )
      }

      keys.forEach((key) => {
        formData[key] = preferencesOptions[key as keyof preferecesOptoinsType]
      })

      const response = await saveDefaultPreferences(formData, recordsPerPage)

      if (response.success) {
        const message = mapKeyToMessage(response.message)
        const successToastId = toast.success(message)
        toast.dismiss(successToastId)
      } else {
        const message = mapKeyToMessage(response.message)
        const errorToastId = toast.error(message)
        toast.dismiss(errorToastId)
      }
    } catch (error) {
      toast.error(`Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='w-[80%] space-y-[1.5rem]'>
      <div className='w-[70%] space-y-[1.5rem]'>
        <HeadingDescription heading='Mail notifications' />
        {preferences.map((preference, index) => (
          <div key={index} className='w-[100%] flex items-center gap-[1.25rem]'>
            {}
            <Switch
              checked={
                preferencesOptions[
                  preference.orderKey as keyof preferecesOptoinsType
                ] === true
              }
              onCheckedChange={(isChecked) => {
                setPreferencesOptions({
                  ...preferencesOptions,
                  [preference.orderKey as keyof preferecesOptoinsType]:
                    isChecked,
                })
              }}
              className='bg-violet-200'
            />
            <div>
              <div className='font-semibold'>{preference.heading}</div>
              <div className='text-gray-600 text-sm not-italic font-normal leading-5'>
                {preference.description}
              </div>
            </div>
          </div>
        ))}
      </div>

      <hr />

      <div className='space-y-[1rem]'>
        <HeadingDescription
          heading='Records per page'
          description='Please select the default number of records to display on a given page.'
        />
        <div className='flex items-center justify-between'>
          <RadioGroup
            onValueChange={(value) => setRecordsPerPage(Number(value))}
            value={recordsPerPage.toString()}
            className='flex gap-[3rem]'
          >
            <div className='flex items-center space-x-2'>
              <RadioGroupItem value='5' id='5' />
              <Label
                htmlFor='5'
                className='text-gray-900 text-sm not-italic font-medium leading-3'
              >
                5
              </Label>
            </div>

            <div className='flex items-center space-x-2'>
              <RadioGroupItem value='10' id='10' />
              <Label
                htmlFor='10'
                className='text-gray-900 text-sm not-italic font-medium leading-3'
              >
                10
              </Label>
            </div>

            <div className='flex items-center space-x-2'>
              <RadioGroupItem value='50' id='50' />
              <Label
                htmlFor='50'
                className='text-gray-900 text-sm not-italic font-medium leading-3'
              >
                50
              </Label>
            </div>

            <div className='flex items-center space-x-2'>
              <RadioGroupItem value='100' id='100' />
              <Label
                htmlFor='100'
                className='text-gray-900 text-sm not-italic font-medium leading-3'
              >
                100
              </Label>
            </div>
          </RadioGroup>
          <div className='my-[1.5rem]'>
            {loading ? (
              <Button disabled>
                <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                Save
              </Button>
            ) : (
              <Button
                onClick={() => handlePreferences()}
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
