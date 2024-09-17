'use client'
import { ReloadIcon } from '@radix-ui/react-icons'
import { AxiosError } from 'axios'
import { useState } from 'react'
import { toast } from 'sonner'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { BACKEND_URL } from '@/constants'
import axiosInstance from '@/utils/axios'
import isValidEmail from '@/utils/isValidEmail'

export default function CustomPlan() {
  const [isSearchLoading, setSearchLoading] = useState(false)
  const [isAddLoading, setAddLoading] = useState(false)
  const [customerFound, setCustomerFound] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [showRates, setShowRates] = useState(false)
  const [rates, setRates] = useState({
    manualTranscriptRate: '',
    strictVerbatiumRate: '',
    additionalChargeRate: '',
    audioTimeCodingRate: '',
    rushOrderRate: '',
    customFormattingRate: '',
    customFormattingTranscriberRate: '',
    customFormattingReviewRate: '6',
    customFormattingMediumDifficultyReviewRate: '6',
    customFormattingHighDifficultyReviewRate: '8',
    agreedMonthlyHours: '',
    customFormatDeadline: '',
    customFormattingOption: 'legal',
    orderType: 'TRANSCRIPTION',
  })
  const [organizationName, setOrganizationName] = useState('')
  const [templateName, setTemplateName] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    if (id === 'userEmail') {
      setUserEmail(value)
    } else {
      setRates((prevRates) => ({ ...prevRates, [id]: value }))
    }
  }

  const handleRadioChange = (value: string) => {
    setRates((prevRates) => ({
      ...prevRates,
      customFormattingOption: value,
    }))
  }

  const handleOrderTypeChange = (newValue: string) => {
    setRates((prevRates) => ({
      ...prevRates,
      orderType: newValue,
    }))
  }

  const handleSearchClick = async () => {
    if (!userEmail) {
      toast.error('Please enter an email address.')
      return
    }

    if (!isValidEmail(userEmail)) {
      toast.error('Please enter a valid email address.')
      return
    }

    try {
      setSearchLoading(true)
      const encodedEmail = encodeURIComponent(userEmail)
      const response = await axiosInstance.get(
        `${BACKEND_URL}/admin/custom-plan-details?email=${encodedEmail}`
      )
      if (response.status === 200) {
        toast.success('Successfully get custom plan details.')
        setSearchLoading(false)
        setShowRates(true)

        if (!response.data.rates) {
          setCustomerFound(false)
        } else {
          setCustomerFound(true)
          const responseData = response.data.rates
          const mappedRates = {
            manualTranscriptRate: responseData.manualRate.toString(),
            strictVerbatiumRate: responseData.svRate.toString(),
            additionalChargeRate: responseData.addChargeRate.toString(),
            audioTimeCodingRate: responseData.audioTimeCoding.toString(),
            rushOrderRate: responseData.rushOrder.toString(),
            customFormattingRate: responseData.customFormat.toString(),
            customFormattingTranscriberRate:
              responseData.customFormatQcRate.toString(),
            customFormattingReviewRate:
              responseData.customFormatReviewRate.toString(),
            customFormattingMediumDifficultyReviewRate:
              responseData.customFormatMediumDifficultyReviewRate.toString(),
            customFormattingHighDifficultyReviewRate:
              responseData.customFormatHighDifficultyReviewRate.toString(),
            agreedMonthlyHours: responseData.agreedMonthlyHours.toString(),
            customFormatDeadline: responseData.deadline.toString(),
            customFormattingOption: responseData.customFormatOption,
            orderType: responseData.orderType,
          }
          setRates(mappedRates)
        }
        setOrganizationName(response.data.organizationName)
        setTemplateName(response.data.templateName)
      }
    } catch (error) {
      setCustomerFound(false)
      setSearchLoading(false)
      setShowRates(false)
      if (error instanceof AxiosError && error.response) {
        const errorToastId = toast.error(error.response?.data?.s)
        toast.dismiss(errorToastId)
      } else {
        toast.error(`User not found. Please check user email.`)
      }
    }
  }

  const handleAddPlanClick = async () => {
    const requiredFields = [
      'manualTranscriptRate',
      'strictVerbatiumRate',
      'additionalChargeRate',
      'audioTimeCodingRate',
      'rushOrderRate',
      'customFormattingRate',
      'customFormattingTranscriberRate',
      'customFormattingReviewRate',
      'customFormattingMediumDifficultyReviewRate',
      'customFormattingHighDifficultyReviewRate',
      'agreedMonthlyHours',
      'customFormatDeadline',
    ]

    for (const field of requiredFields) {
      if (!rates[field as keyof typeof rates]) {
        toast.error(
          `Please enter a valid ${field
            .replace(/([A-Z])/g, ' $1')
            .toLowerCase()}.`
        )
        return
      }
    }
    try {
      setAddLoading(true)
      const response = await axiosInstance.post(
        `${BACKEND_URL}/admin/custom-plan-details`,
        {
          email: userEmail,
          rates,
        }
      )
      if (response.status === 200) {
        toast.success(
          `Custom plan ${customerFound ? 'update' : 'added'} successfully!`
        )
        setAddLoading(false)
      }
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        const errorToastId = toast.error(error.response?.data?.s)
        toast.dismiss(errorToastId)
      } else {
        toast.error(`Failed to add custom plan.`)
      }
      setAddLoading(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Custom Plan</CardTitle>
          <CardDescription>
            Please enter the email address to search for customer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid gap-6'>
            <div className='grid gap-3'>
              <Label htmlFor='userEmail'>Email Address</Label>
              <Input
                id='userEmail'
                type='email'
                className='w-full'
                placeholder='test@email.com'
                value={userEmail}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {isSearchLoading ? (
            <Button disabled className='mt-5'>
              Please wait
              <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
            </Button>
          ) : (
            <Button className='mt-5 mb-3' onClick={handleSearchClick}>
              Search
            </Button>
          )}
          <Separator />
          {showRates && (
            <>
              {customerFound ? (
                <>
                  <Alert variant='success'>
                    <AlertTitle>
                      Custom Plan Found for user {userEmail}
                    </AlertTitle>
                    <AlertDescription>
                      Modify the rates and update the plan for the user.
                    </AlertDescription>
                  </Alert>
                </>
              ) : (
                <>
                  <Alert variant='destructive'>
                    <AlertTitle>
                      Custom Plan Not Found for user {userEmail}
                    </AlertTitle>
                    <AlertDescription>
                      No custom plan found for this user. Add the plans and the
                      user will be added to custom plan.
                    </AlertDescription>
                  </Alert>
                </>
              )}
              <div className='grid gap-6 mt-5'>
                <div className='grid gap-3'>
                  <Label htmlFor='manualTranscriptRate'>
                    Manual transcript rate
                  </Label>
                  <Input
                    id='manualTranscriptRate'
                    type='number'
                    className='w-full'
                    placeholder='Manual transcript rate'
                    value={rates.manualTranscriptRate}
                    onChange={handleInputChange}
                  />
                </div>
                <div className='grid gap-3'>
                  <Label htmlFor='strictVerbatiumRate'>
                    Strict Verbatim rate
                  </Label>
                  <Input
                    id='strictVerbatiumRate'
                    type='number'
                    className='w-full'
                    placeholder='Strict Verbatim rate'
                    value={rates.strictVerbatiumRate}
                    onChange={handleInputChange}
                  />
                </div>
                <div className='grid gap-3'>
                  <Label htmlFor='additionalChargeRate'>
                    Additional Charge rate
                  </Label>
                  <Input
                    id='additionalChargeRate'
                    type='number'
                    className='w-full'
                    placeholder='Additional Charge rate'
                    value={rates.additionalChargeRate}
                    onChange={handleInputChange}
                  />
                </div>
                <div className='grid gap-3'>
                  <Label htmlFor='audioTimeCodingRate'>
                    Audio time coding rate
                  </Label>
                  <Input
                    id='audioTimeCodingRate'
                    type='number'
                    className='w-full'
                    placeholder='Audio time coding rate'
                    value={rates.audioTimeCodingRate}
                    onChange={handleInputChange}
                  />
                </div>
                <div className='grid gap-3'>
                  <Label htmlFor='rushOrderRate'>Rush order rate</Label>
                  <Input
                    id='rushOrderRate'
                    type='number'
                    className='w-full'
                    placeholder='Rush order rate'
                    value={rates.rushOrderRate}
                    onChange={handleInputChange}
                  />
                </div>
                <div className='grid gap-3'>
                  <Label htmlFor='customFormattingRate'>
                    Custom formatting rate
                  </Label>
                  <Input
                    id='customFormattingRate'
                    type='number'
                    className='w-full'
                    placeholder='Custom formatting rate'
                    value={rates.customFormattingRate}
                    onChange={handleInputChange}
                  />
                </div>
                <div className='grid gap-3'>
                  <Label htmlFor='customFormattingTranscriberRate'>
                    Custom formatting qc rate
                  </Label>
                  <Input
                    id='customFormattingTranscriberRate'
                    type='number'
                    className='w-full'
                    placeholder='Custom formatting qc rate'
                    value={rates.customFormattingTranscriberRate}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <p>Custom Formatting Review Rates</p>
                  <div className='border border-2 p-3 rounded-[10px]'>
                    {' '}
                    <div className='grid gap-3 mt-3 mb-2'>
                      <Label htmlFor='customFormattingReviewRate'>
                        Low difficulty
                      </Label>
                      <Input
                        id='customFormattingReviewRate'
                        type='number'
                        className='w-full'
                        placeholder='Custom formatting low difficulty review rate'
                        value={rates.customFormattingReviewRate}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className='grid gap-3 mt-3 mb-2'>
                      <Label htmlFor='customFormattingReviewRate'>
                        Medium difficulty
                      </Label>
                      <Input
                        id='customFormattingMediumDifficultyReviewRate'
                        type='number'
                        className='w-full'
                        placeholder='Custom formatting medium difficulty review rate'
                        value={rates.customFormattingMediumDifficultyReviewRate}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className='grid gap-3'>
                      <Label htmlFor='customFormattingReviewRate'>
                        High difficulty
                      </Label>
                      <Input
                        id='customFormattingHighDifficultyReviewRate'
                        type='number'
                        className='w-full'
                        placeholder='Custom formatting high difficulty review rate'
                        value={rates.customFormattingHighDifficultyReviewRate}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>

                <div className='grid gap-3'>
                  <Label htmlFor='agreedMonthlyHours'>
                    Agreed Monthly Hours
                  </Label>
                  <Input
                    id='agreedMonthlyHours'
                    type='number'
                    className='w-full'
                    placeholder='Agreed Monthly Hours'
                    value={rates.agreedMonthlyHours}
                    onChange={handleInputChange}
                  />
                </div>
                <div className='grid gap-3'>
                  <Label htmlFor='customFormatDeadline'>
                    Custom Format Deadline (Days)
                  </Label>
                  <Input
                    id='customFormatDeadline'
                    type='number'
                    className='w-full'
                    placeholder='Custom Format Deadline (Days)'
                    value={rates.customFormatDeadline}
                    onChange={handleInputChange}
                  />
                </div>
                <div className='grid gap-3'>
                  <Label htmlFor='name'>
                    Select a Custom Formatting Option
                  </Label>
                  <RadioGroup
                    value={rates.customFormattingOption}
                    onValueChange={handleRadioChange}
                  >
                    <div className='flex items-center space-x-2'>
                      <RadioGroupItem value='legal' id='legal' />
                      <Label htmlFor='legal'>Legal</Label>
                    </div>
                    <div className='flex items-center space-x-2'>
                      <RadioGroupItem value='medical' id='medical' />
                      <Label htmlFor='medical'>Medical</Label>
                    </div>
                    <div className='flex items-center space-x-2'>
                      <RadioGroupItem value='general' id='general' />
                      <Label htmlFor='general'>General</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className='grid gap-3'>
                  <Label htmlFor='orderType'>Order Type</Label>
                  <Select
                    value={rates.orderType}
                    onValueChange={handleOrderTypeChange}
                  >
                    <SelectTrigger className='w-[270px]'>
                      <SelectValue placeholder='Order Type' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='TRANSCRIPTION'>
                        TRANSCRIPTION
                      </SelectItem>
                      <SelectItem value='TRANSCRIPTION_FORMATTING'>
                        TRANSCRIPTION_FORMATTING
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className='grid gap-3'>
                  <Label htmlFor='organizationName'>Organization Name</Label>
                  <div>{organizationName}</div>
                </div>
                <div className='grid'>
                  <Label htmlFor='templateName' className='mb-3'>
                    Template Name
                  </Label>
                  {templateName ? (
                    <>
                      {templateName.split(',').map((name, index) => (
                        <div key={index}>{name}</div>
                      ))}
                    </>
                  ) : (
                    <div>-</div>
                  )}
                </div>
              </div>
              {isAddLoading ? (
                <Button disabled className='mt-5'>
                  Please wait
                  <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
                </Button>
              ) : (
                <Button className='mt-5 mb-3' onClick={handleAddPlanClick}>
                  {customerFound ? 'Update Plan' : 'Add Plan'}{' '}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </>
  )
}
