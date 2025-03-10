/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { ReloadIcon } from '@radix-ui/react-icons'
import { Dropin } from 'braintree-web-drop-in'
import DropIn from 'braintree-web-drop-in-react'
import { Check, ChevronDown, ChevronUp, MoveRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import React, { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'

import Bill from './bill'
import PaymentSuccessIcon from '../payment-success'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible'
import { OrderOptions } from '@/app/(dashboard)/payments/invoice/[invoice_id]/components/order-options'
import { getInvoiceDetails } from '@/app/actions/invoice/[invoiceId]'
import { updateFreeOrderOptionsAction } from '@/app/actions/order/update-free-order-options'
import { updateOrderOptions } from '@/app/actions/order/update-order-options'
import { applyDiscount } from '@/app/actions/payment/apply-discount'
import { checkout } from '@/app/actions/payment/checkout'
import { checkoutViaCredits } from '@/app/actions/payment/checkout-via-credits'
import { getClientTokenAction } from '@/app/actions/payment/client-token'
import { saveDefaultInstructions } from '@/app/actions/user/default-instructions'
import BillBreakdownDialog from '@/components/bill-breakdown'
import { Icons } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  RUSH_ORDER_PRICE,
  STRICT_VERBATIUM_PRICE,
  FREE_PRICE,
} from '@/constants'
import { handleBillingPaymentMethod } from '@/utils/billingPaymentHandler'

interface Option {
  id: string
  name: string
  enabled: boolean
  rate: number
  description: string
}

interface ConfigurationState {
  speakerNameFormat: string
  transcriptTemplate: string
  spellingStyle: string
}

interface InstructionsState {
  instructions: string
  accents: string
  speakers: string
}

interface Payment {
  fileSize: number
  baseRate: number
  discount: number
  totalAmount: number
  invoiceId: string
  options: {
    name: string
    rate: number
  }[]
  creditsUsed: number
}

interface PaymentSuccessData {
  transactionId: string
  paymentMethod: string
  pp_account?: string
  cc_last4?: string
  amount: number
}

interface Template {
  id: number
  name: string
}

const TranscriptionOrder = ({ invoiceId }: { invoiceId: string }) => {
  const router = useRouter()
  const { data: session } = useSession()
  const braintreeRef = useRef<HTMLDivElement>(null)
  const steps = [
    {
      label: 'Customise',
      step: 1,
    },
    {
      label: 'Instructions',
      step: 2,
    },
    {
      label: 'Payment',
      step: 3,
    },
  ]
  const [activeStep, setActiveStep] = useState(1)
  const [options, setOptions] = React.useState<Option[]>([
    {
      id: 'exd',
      name: 'Rush hour',
      enabled: false,
      rate: RUSH_ORDER_PRICE,
      description: `All files are prioritised for completion. Get your files delivered up to
        3x faster. Files exceeding a duration of 2 hours will require more than
        12 hours to process. The lengthier the file, the longer is the
        turnaround time. Also, files with audio issues may be delayed.`,
    },
    {
      id: 'vb',
      name: 'Strict verbatim',
      enabled: false,
      rate: STRICT_VERBATIUM_PRICE,
      description: `Include all utterances (e.g. Mm-hmm, uh-huh, umm, uh, etc.). By default the transcripts are non-strict verbatim and do not include these utterances unless necessary.`,
    },
    {
      id: 'ts',
      name: 'Audio time coding',
      enabled: false,
      rate: FREE_PRICE,
      description: `The audio timestamp will be added before each paragraph. New paragraphs are started at every change of speaker or at every 3 minutes, whichever is earlier.`,
    },
    {
      id: 'sub',
      name: 'Subtitle file',
      enabled: false,
      rate: FREE_PRICE,
      description: `A subtitle file will also be provided in WebVTT (.vtt) and SubRip (.srt) formats. It can be used as YouTube caption file and with other video players.`,
    },
    {
      id: 'sif',
      name: 'Speaker tracking',
      enabled: false,
      rate: FREE_PRICE,
      description: `The speaker initial will be added before each paragraph. The names of speakers, as provided or as spoken in the audio, will be used. Speaker 1, Speaker 2 and so on will be used if none are available.`,
    },
  ])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [clientToken, setClientToken] = useState<string | null>(null)
  const [instance, setInstance] = useState<Dropin | null>(null)
  const [paymentInfo, setPaymentInfo] = useState<Payment | null>(null)
  const [loadingPay, setLoadingPay] = useState<boolean>(false)
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false)
  const [loadingOrderUpdate, setLoadingOrderUpdate] = useState<boolean>(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [paymentSuccessData, setPaymentSuccessData] =
    useState<PaymentSuccessData | null>(null)
  const [creditsUsed, setCreditsUsed] = useState<number>(0)
  const [couponCode, setCouponCode] = useState<string>('')
  const [loadingCoupon, setLoadingCoupon] = useState<boolean>(false)
  const [billBreakdownOpen, setBillBreakdownOpen] = useState<boolean>(false)
  const [bills, setBills] = useState<
    { name: string; amount: number; duration: number; fileId: string }[]
  >([])
  const [templateCollapsible, setTemplatesCollapsible] =
    useState<boolean>(false)
  const [spellingCollapsible, setSpellingCollapsible] = useState<boolean>(false)
  const [billingEnabled, setBillingEnabled] = useState<boolean>(false)
  const [loadingInstructions, setLoadingInstructions] = useState(false)

  useEffect(() => {
    const fetchOrderInformation = async () => {
      setIsLoading(true)
      try {
        const tokenResponse = await getClientTokenAction()
        const response = await getInvoiceDetails(invoiceId, 'TRANSCRIPTION')
        if (!response.responseData) {
          throw new Error('No response data received')
        }

        const orderOptions = JSON.parse(
          response.responseData.invoice.options || '{}'
        )
        setCreditsUsed(response.responseData.creditsUsed)
        setBillingEnabled(response.responseData.isBillingEnabledForCustomer)
        const updatedOptions = options.map((option) => {
          const isEnabled = orderOptions[option.id] === 1
          if (option.id === 'exd') {
            return {
              ...option,
              enabled: isEnabled,
              rate: response.responseData.rates.rush_order,
            }
          } else if (option.id === 'vb') {
            return {
              ...option,
              enabled: isEnabled,
              rate: response.responseData.rates.verbatim,
            }
          } else {
            return { ...option, enabled: isEnabled }
          }
        })
        setOptions(updatedOptions)
        setConfiguration({
          speakerNameFormat: orderOptions.si.toString(),
          transcriptTemplate: orderOptions.tmp.toString(),
          spellingStyle: orderOptions.sp,
        })
        setInstructions({
          instructions: response.responseData.invoice.instructions || '',
          accents: 'NA',
          speakers: '1',
        })
        const enabledOptions = updatedOptions
          .filter((option) => option.enabled)
          .map((option) => ({ name: option.name, rate: option.rate }))
        setPaymentInfo({
          fileSize:
            response.responseData.files.reduce(
              (total: number, file: { File: { duration: number } }) =>
                total + file.File.duration,
              0
            ) / 60,
          options: enabledOptions,
          baseRate: response.responseData.invoice.orderRate,
          discount: response.responseData.invoice.discount,
          totalAmount: response.responseData.invoice.amount,
          invoiceId,
          creditsUsed: response.responseData.creditsUsed,
        })
        const templateData = response.responseData.templates.map(
          (template: Template) => ({
            id: template.id,
            name: template.name,
          })
        )
        const bills = response.responseData.files.map(
          (file: {
            File: { filename: string; duration: number; fileId: string }
            price: number
          }) => ({
            name: file.File.filename,
            amount: file.price,
            duration: file.File.duration,
            fileId: file.File.fileId,
          })
        )
        setBills(bills)
        setTemplates(templateData)
        setClientToken(tokenResponse?.clientToken ?? null)

        const gtag = (window as any).gtag
        if (typeof gtag === 'function') {
          gtag('event', 'initiate_order', {
            customer_id: session?.user?.userId ?? 'public',
            file_ids: response.responseData.files.map(
              (file: { File: { fileId: string } }) => file.File.fileId
            ),
          })
        }

        setIsLoading(false)
      } catch (err) {
        console.error('Failed to fetch pending files:', err)
        setIsLoading(false)
      }
    }

    fetchOrderInformation()
  }, [])

  useEffect(() => {
    if (paymentInfo) {
      const enabledOptions = options
        .filter((option) => option.enabled)
        .map((option) => ({ name: option.name, rate: option.rate }))
      setPaymentInfo((prevPaymentInfo: Payment | null) => ({
        ...prevPaymentInfo!,
        options: enabledOptions,
      }))
    }
  }, [options])

  const [configuration, setConfiguration] = useState<ConfigurationState>({
    speakerNameFormat: '0',
    transcriptTemplate: '0',
    spellingStyle: 'en_US',
  })

  const [instructions, setInstructions] = useState<InstructionsState>({
    instructions: '',
    accents: '0',
    speakers: '1',
  })

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

  const gtagPurchaseEvent = (amount: number, invoiceId: string) => {
    const gtag = (window as any).gtag
    if (typeof gtag === 'function') {
      gtag('event', 'purchase', {
        transaction_id: invoiceId,
        value: amount,
        tax: 10,
        shipping: 10,
        currency: 'USD',
        new_customer: false,
        coupon: 'No',
        items: bills.map((bill, index) => ({
          item_name: bill.name,
          item_id: bill.fileId,
          index: index,
          price: bill.amount,
          quantity: 1,
        })),
      })
    }
  }

  const handleSpeakerNameFormatChange = async (value: string) => {
    setConfiguration((prevState) => ({
      ...prevState,
      speakerNameFormat: value,
    }))
    updateFreeOrderOptions('si', value, 'speaker name format')
  }

  const handleTranscriptTemplateChange = async (value: string) => {
    setConfiguration((prevState) => ({
      ...prevState,
      transcriptTemplate: value,
    }))
    updateFreeOrderOptions('tmp', value, 'transcript template')
  }

  const handleSpellingStyleChange = async (value: string) => {
    setConfiguration((prevState) => ({ ...prevState, spellingStyle: value }))
    updateFreeOrderOptions('sp', value, 'spelling style')
  }

  const handleSpeakersChange = (value: string) => {
    setInstructions((prevState) => ({ ...prevState, speakers: value }))
  }

  const handleAccentsChange = (value: string) => {
    setInstructions((prevState) => ({ ...prevState, accents: value }))
  }

  const handleInstructionsChange = (value: string) => {
    setInstructions((prevState) => ({ ...prevState, instructions: value }))
  }

  const handleEnabledChange = async (index: number, isEnabled: boolean) => {
    const updatedOptions = [...options]
    updatedOptions[index].enabled = isEnabled
    setOptions(updatedOptions)
    try {
      setLoadingOrderUpdate(true)

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
        setPaymentInfo((prevPaymentInfo: Payment | null) => ({
          ...prevPaymentInfo!,
          totalAmount: response.invoice?.amount ?? 0,
          creditsUsed: response.creditsUsed ?? 0,
        }))
        setCreditsUsed(response.creditsUsed ?? 0)
        setLoadingOrderUpdate(false)
      } else {
        toast.error(`Failed to update order option`)
        setLoadingOrderUpdate(false)
      }
    } catch (error) {
      toast.error(`Failed to update order option`)
      setLoadingOrderUpdate(false)
    }
  }

  const nextStep = async () => {
    if (activeStep === steps.length) {
      return null
    }
    if (activeStep === 2) {
      updateFreeOrderOptions(
        'instructions',
        instructions.instructions,
        'instructions'
      )
    }
    setActiveStep((prevStep) => prevStep + 1)
  }

  const prevStep = () => {
    setActiveStep((prevStep) => prevStep - 1)
  }

  const totalSteps = steps.length

  const handlePaymentMethod = async () => {
    if (!instance) return

    try {
      const { nonce } = await instance.requestPaymentMethod()
      setLoadingPay(true)

      const response = await checkout({
        paymentMethodNonce: nonce,
        invoiceId,
        orderType: 'TRANSCRIPTION',
      })

      setLoadingPay(false)
      if (response.success) {
        setPaymentSuccessData((prevData) => ({
          ...prevData,
          transactionId: response.transactionId ?? '',
          paymentMethod: response.paymentMethod ?? 'CREDITCARD',
          pp_account: response.pp_account ?? '',
          cc_last4: response.cc_last4 ?? '',
          amount: response.invoice?.amount ?? 0,
        }))
        gtagPurchaseEvent(response.invoice?.amount ?? 0, invoiceId)
        setPaymentSuccess(true)
      } else {
        toast.error(`Payment failed: ${response.message}`)
      }
    } catch (err) {
      setLoadingPay(false)
      console.error('Error processing payment:', err)
      toast.error('Error processing payment')
    }
  }

  const handleCouponApply = async () => {
    if (couponCode.length === 0) {
      toast.error('Please enter a coupon code')
      return
    }
    try {
      setLoadingCoupon(true)
      const response = await applyDiscount({ invoiceId, couponCode })
      if (!response.success) {
        throw new Error('Failed to apply coupon code')
      }
      const tId = toast.success(
        `Successfully applied ${couponCode} coupon code`
      )
      toast.dismiss(tId)
      setPaymentInfo((prevPaymentInfo: Payment | null) => {
        if (!prevPaymentInfo) return null
        return {
          ...prevPaymentInfo,
          discount: response.totalDiscount ?? 0,
        }
      })
      setLoadingCoupon(false)
    } catch (error) {
      toast.error(`Failed to add free credits`)
      setLoadingCoupon(false)
    }
  }

  const handlePaymentMethodViaCredits = async () => {
    try {
      setLoadingPay(true)

      const response = await checkoutViaCredits({
        invoiceId,
        orderType: 'TRANSCRIPTION',
      })

      if (response.success) {
        const data = response
        setPaymentSuccessData((prevData) => ({
          ...prevData,
          transactionId: data.transactionId ?? '',
          paymentMethod: data.paymentMethod ?? 'CREDITS',
          pp_account: data.pp_account ?? '',
          cc_last4: data.cc_last4 ?? '',
          amount: data.invoice?.amount ?? 0,
        }))
        gtagPurchaseEvent(data.invoice?.amount ?? 0, invoiceId)
        setPaymentSuccess(true)
        setLoadingPay(false)
      } else {
        setLoadingPay(false)
        toast.error(`Failed to order the file`)
      }
    } catch (error) {
      setLoadingPay(false)
      toast.error(`Failed to order the file`)
    }
  }

  const handlePaymentMethodViaBilling = async () => {
    await handleBillingPaymentMethod(
      'TRANSCRIPTION',
      invoiceId,
      setPaymentSuccessData,
      setPaymentSuccess,
      setLoadingPay,
      gtagPurchaseEvent
    )
  }

  async function handleDefaultInstruction() {
    setLoadingInstructions(true)
    try {
      const response = await saveDefaultInstructions(instructions.instructions)
      if (response.success) {
        const successToastId = toast.success(
          'Successfully saved as default instructions'
        )
        toast.dismiss(successToastId)
      } else {
        toast.error(`Error updating default instructions`)
      }
    } catch (error) {
      toast.error(`Error updating default instructions`)
    } finally {
      setLoadingInstructions(false)
    }
  }

  useEffect(() => {
    if (activeStep === 3 && braintreeRef.current) {
      braintreeRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [activeStep])

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '80vh',
        }}
      >
        <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
        <p>Loading...</p>
      </div>
    )
  }
  return (
    <div className='flex flex-col w-[100%] my-8'>
      <div className='w-full max-w-2xl mx-auto px-4 overflow-y-auto'>
        <div className='flex justify-between gap-6'>
          {steps.map(({ step, label }, index) => (
            <div key={step}>
              <div className={`flex items-center justify-center gap-3`}>
                <div
                  className={`rounded-full p-1 ${
                    activeStep >= step ? 'bg-[#36F0C3]' : 'bg-secondary'
                  }`}
                >
                  <Check className='h-4 w-4 font-bold text-black' />
                </div>

                <div className='text-lg font-normal'>{label}</div>
                {index < steps.length - 1 && (
                  <MoveRight className='h-6 w-6 ml-10 text-primary hidden lg:block' />
                )}
              </div>
              {activeStep == step && <Icons.borderLine className='mt-6 ml-2' />}
            </div>
          ))}
        </div>
        <Separator />
      </div>
      <div>
        <div className='flex'>
          {activeStep === 1 && (
            <div className='w-[100%] md:w-[50%] p-4'>
              <ScrollArea className='h-[62vh]'>
                {options.map((option, index) => (
                  <OrderOptions
                    id={option.id}
                    key={index}
                    name={option.name}
                    isEnabled={option.enabled}
                    rate={option.rate}
                    onEnabledChange={(isEnabled) =>
                      handleEnabledChange(index, isEnabled)
                    }
                    description={option.description}
                  />
                ))}
                <div className='flex-col lg:flex lg:flex-row justify-between mt-10 mr-5'>
                  <div className='flex items-center gap-2'>
                    <div className='text-md font-medium'>
                      Speaker name format
                    </div>
                  </div>
                  <div className='text-md font-normal mt-5 lg:mt-1'>
                    <RadioGroup
                      defaultValue={configuration.speakerNameFormat}
                      onValueChange={handleSpeakerNameFormatChange}
                      className='flex gap-10'
                    >
                      <div className='flex items-center space-x-2'>
                        <RadioGroupItem value='0' id='0' />{' '}
                        <Label htmlFor='0'>Initials</Label>
                      </div>
                      <div className='flex items-center space-x-2'>
                        <RadioGroupItem value='1' id='1' />
                        <Label htmlFor='1'>Full names</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
                <div className='flex-col lg:flex lg:flex-row justify-between mt-10 mr-5'>
                  <Collapsible
                    open={templateCollapsible}
                    onOpenChange={setTemplatesCollapsible}
                    className='mb-6 mr-5'
                  >
                    <div className='flex justify-between flex-wrap'>
                      <div className='flex items-center gap-2'>
                        <div className='text-md font-medium'>
                          Transcript template
                        </div>
                        <CollapsibleTrigger>
                          {templateCollapsible ? (
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
                      <Link href='/' className='text-primary'>
                        Contact Support
                      </Link>
                    </CollapsibleContent>
                  </Collapsible>
                  <div className='text-md font-normal mt-5 lg:mt-2'>
                    <Select
                      defaultValue={configuration.transcriptTemplate}
                      onValueChange={handleTranscriptTemplateChange}
                    >
                      <SelectTrigger className='w-[220px]'>
                        <SelectValue placeholder='Template' />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
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
                <div className='flex-col lg:flex lg:flex-row justify-between mt-10 mr-5'>
                  <Collapsible
                    open={spellingCollapsible}
                    onOpenChange={setSpellingCollapsible}
                    className='mb-6 mr-5'
                  >
                    <div className='flex justify-between flex-wrap'>
                      <div className='flex items-center gap-2'>
                        <div className='text-md font-medium'>
                          Spelling style
                        </div>
                        <CollapsibleTrigger>
                          {spellingCollapsible ? (
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
                        contact cupport
                      </Link>{' '}
                      for more options.
                    </CollapsibleContent>
                  </Collapsible>

                  <div className='text-md font-normal mt-5 lg:mt-2'>
                    <RadioGroup
                      defaultValue={configuration.spellingStyle}
                      onValueChange={handleSpellingStyleChange}
                      className='flex gap-10'
                    >
                      <div>
                        <div className='flex items-center space-x-2'>
                          <RadioGroupItem value='en_US' id='en_US' />{' '}
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
              </ScrollArea>
            </div>
          )}

          {activeStep === 2 && (
            <div className='w-[100%] md:w-[50%] p-4'>
              <div className='text-lg text-primary font-medium mb-10'>
                Add special instructions and file information
              </div>
              <ScrollArea className=''>
                <div>
                  <div className='text-md font-medium mb-2'>
                    Special instructions
                  </div>
                  <Textarea
                    placeholder='Enter here'
                    value={instructions.instructions}
                    onChange={(e) => handleInstructionsChange(e.target.value)}
                    rows={4}
                    className='focus-visible:ring-0'
                  />
                  <div className='text-sm text-muted-foreground mt-2'>
                    Please enter special instructions, terms, acronyms,
                    keywords, names of places, speaker names, etc.
                  </div>
                </div>
                <div className='flex-col lg:flex lg:flex-row justify-between mt-10 mr-5'>
                  <div className='flex items-center gap-2'>
                    <div>
                      <div className='text-md font-medium'>Accents</div>
                      <div className='text-sm text-muted-foreground w-[250px] mt-2'>
                        An additional charge may be applicable for accents other
                        than North American/Canadian.
                      </div>
                    </div>
                  </div>
                  <div className='text-md font-normal mt-5 lg:mt-0'>
                    <Select
                      defaultValue={instructions.accents}
                      onValueChange={handleAccentsChange}
                    >
                      <SelectTrigger className='w-[220px]'>
                        <SelectValue placeholder='Speaker Accent' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='NA'>North American</SelectItem>
                        <SelectItem value='CA'>Canadian</SelectItem>
                        <SelectItem value='AU'>Australian</SelectItem>
                        <SelectItem value='GB'>British</SelectItem>
                        <SelectItem value='IN'>Indian</SelectItem>
                        <SelectItem value='AA'>African-American</SelectItem>
                        <SelectItem value='AF'>African</SelectItem>
                        <SelectItem value='RW'>Rwandan</SelectItem>
                        <SelectItem value='GR'>German</SelectItem>
                        <SelectItem value='FR'>French</SelectItem>
                        <SelectItem value='IT'>Italian</SelectItem>
                        <SelectItem value='PL'>Polish</SelectItem>
                        <SelectItem value='EU'>European</SelectItem>
                        <SelectItem value='SP'>Spanish</SelectItem>
                        <SelectItem value='RU'>Russian</SelectItem>
                        <SelectItem value='FN'>Finnish</SelectItem>
                        <SelectItem value='TK'>Turkish</SelectItem>
                        <SelectItem value='ID'>Indonesian</SelectItem>
                        <SelectItem value='MX'>Mexican</SelectItem>
                        <SelectItem value='HP'>Hispanic</SelectItem>
                        <SelectItem value='LA'>Latin American</SelectItem>
                        <SelectItem value='BR'>Brazilian</SelectItem>
                        <SelectItem value='PR'>Portugese</SelectItem>
                        <SelectItem value='NL'>Dutch</SelectItem>
                        <SelectItem value='ME'>Middle Eastern</SelectItem>
                        <SelectItem value='IR'>Irish</SelectItem>
                        <SelectItem value='AS'>Asian</SelectItem>
                        <SelectItem value='CN'>Chinese</SelectItem>
                        <SelectItem value='KO'>Korean</SelectItem>
                        <SelectItem value='SG'>Singaporean</SelectItem>
                        <SelectItem value='EA'>East Asian</SelectItem>
                        <SelectItem value='NZ'>New Zealand</SelectItem>
                        <SelectItem value='AB'>Arabic</SelectItem>
                        <SelectItem value='MY'>Malaysian</SelectItem>
                        <SelectItem value='JP'>Japanese</SelectItem>
                        <SelectItem value='SE'>Southeast Asian</SelectItem>
                        <SelectItem value='SA'>South African</SelectItem>
                        <SelectItem value='JM'>Jamaican</SelectItem>
                        <SelectItem value='WI'>West Indian</SelectItem>
                        <SelectItem value='AG'>Aboriginal</SelectItem>
                        <SelectItem value='SC'>Scottish</SelectItem>
                        <SelectItem value='NP'>Nepalese</SelectItem>
                        <SelectItem value='EG'>Egyptian</SelectItem>
                        <SelectItem value='AI'>Indigenous American</SelectItem>
                        <SelectItem value='NTA'>
                          Unsure/Unknown/Not Applicable
                        </SelectItem>
                        <SelectItem value='NN'>
                          Other Non-native/Mixed
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className='flex-col lg:flex lg:flex-row justify-between mt-10 mr-5'>
                  <div className='flex items-center gap-2'>
                    <div>
                      <div className='text-md font-medium'>
                        Speakers (in each file)
                      </div>
                      <div className='text-sm text-muted-foreground w-[250px] mt-2'>
                        Speaker tracking for 4 or more speakers is best effort
                        and may not be correct.
                      </div>
                    </div>
                  </div>
                  <div className='text-md font-normal mt-5 lg:mt-0'>
                    <Select
                      defaultValue={instructions.speakers}
                      onValueChange={handleSpeakersChange}
                    >
                      <SelectTrigger className='w-[220px]'>
                        <SelectValue placeholder='Speakers' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='1'>1</SelectItem>
                        <SelectItem value='2'>2</SelectItem>
                        <SelectItem value='3'>3</SelectItem>
                        <SelectItem value='4+'>4 or more</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </ScrollArea>
            </div>
          )}

          {activeStep === 3 && (
            <div className='w-[100%] md:w-[50%] p-4'>
              <div className='text-lg text-primary font-medium mb-10'>
                Payment terms
              </div>
              <ScrollArea>
                <ol className='text-md text-muted-foreground mt-4 ml-2'>
                  <li className=''>
                    1. <b>Rate:</b> The client will be charged at a rate of $
                    {paymentInfo
                      ? (
                          paymentInfo?.baseRate +
                          paymentInfo?.options.reduce(
                            (acc, option) => acc + option.rate,
                            0
                          )
                        ).toFixed(2)
                      : 0}{' '}
                    per audio minute.
                  </li>
                  <li className=''>
                    2. <b>Upfront Payment:</b> Full payment is required upfront
                    before the commencement of the transcription services.
                  </li>
                  <li className=''>
                    3. <b>Payment Methods:</b> Payments can be made using a
                    Credit Card, PayPal, or{' '}
                    <a
                      href='/customer-guide#credits'
                      target='_blank'
                      className='text-primary'
                    >
                      Account Credits
                    </a>
                    .
                  </li>
                  <li className=''>
                    4. <b>Additional Terms:</b> You can cancel your transcript
                    order before editing starts. Once delivered, no refunds will
                    be provided.
                  </li>
                </ol>
                <div className='flex justify-between flex-wrap mt-20'>
                  <div className='flex flex-col justify-between items-center'>
                    <Image
                      loading='lazy'
                      src='/assets/images/home/tag.svg'
                      alt='Best industry prices'
                      width={32}
                      height={32}
                    />
                    <div className='text-center my-auto font-normal w-[92px]'>
                      Best industry prices
                    </div>
                  </div>
                  <div className='flex flex-col justify-between items-center'>
                    <Image
                      loading='lazy'
                      src='/assets/images/home/human.svg'
                      alt='Human verified'
                      width={32}
                      height={32}
                    />
                    <div className='text-center my-auto font-normal w-[92px]'>
                      Human verified
                    </div>
                  </div>
                  <div className='flex flex-col justify-between items-center'>
                    <Image
                      loading='lazy'
                      src='/assets/images/home/verified.svg'
                      alt='50K+ verified transcribers'
                      width={28}
                      height={28}
                    />
                    <div className='text-center my-auto font-normal w-[102px]'>
                      50K+ verified transcribers
                    </div>
                  </div>
                  <div className='flex flex-col justify-between items-center'>
                    <Image
                      loading='lazy'
                      src='/assets/images/home/call-support.svg'
                      alt='20/5 customer'
                      width={32}
                      height={32}
                    />
                    <div className='text-center my-auto font-normal w-[122px]'>
                      20/5 customer support
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          )}

          <div className='w-[100%] md:w-[50%] bg-muted p-4 hidden lg:block'>
            <div className='pl-10'>
              <div className='flex justify-between items-center'>
                <div className='text-lg text-primary font-medium mb-10'>
                  Your bill
                </div>
                <div
                  className='text-md cursor-pointer font-medium mb-10 mr-5 underline'
                  onClick={() => setBillBreakdownOpen(true)}
                >
                  View invoice
                </div>
              </div>

              {paymentSuccess ? (
                <ScrollArea className='h-[57vh]'>
                  <div className='flex flex-col justify-center items-center mb-6 mt-[-40px]'>
                    <PaymentSuccessIcon />
                    <div
                      className='text-lg font-medium mr-5 mt-[-40px]'
                      test-id='get-payment-success'
                    >
                      Payment Successful!
                    </div>
                  </div>

                  <div className='flex justify-between mr-5 mb-6'>
                    <div className='flex items-center gap-2'>
                      <div className='text-md font-medium'>Total Duration</div>
                    </div>
                    <div className='text-md font-normal'>
                      {paymentInfo?.fileSize.toFixed(2)} min
                    </div>
                  </div>
                  <div className='flex justify-between mr-5 mb-6'>
                    <div className='flex items-center gap-2'>
                      <div className='text-md font-medium'>Base rate</div>
                    </div>
                    <div className='text-md font-normal'>
                      ${paymentInfo?.baseRate.toFixed(2)} /min
                    </div>
                  </div>
                  <div className='flex justify-between mr-5 mb-6'>
                    <div className='flex items-center gap-2'>
                      <div className='text-md font-medium'>Transaction ID</div>
                    </div>
                    <div className='text-md font-normal'>
                      {paymentSuccessData?.transactionId}
                    </div>
                  </div>
                  <div className='flex justify-between mr-5 mb-6'>
                    <div className='flex items-center gap-2'>
                      <div className='text-md font-medium'>Payment Method</div>
                    </div>
                    <div className='text-md font-normal'>
                      {paymentSuccessData?.paymentMethod}
                    </div>
                  </div>
                  {paymentSuccessData?.paymentMethod !== 'CREDITS' && (
                    <div className='flex justify-between mr-5 mb-6'>
                      <div className='flex items-center gap-2'>
                        <div className='text-md font-medium'>
                          {paymentSuccessData?.cc_last4 ? 'Card ending' : 'PP'}
                        </div>
                      </div>
                      <div className='text-md font-normal'>
                        {paymentSuccessData?.cc_last4 ||
                          paymentSuccessData?.pp_account}
                      </div>
                    </div>
                  )}

                  {paymentInfo && paymentInfo.discount > 0 && (
                    <div className='flex justify-between mr-5 mb-6'>
                      <div className='flex items-center gap-2'>
                        <div className='text-md font-medium'>Discount</div>
                      </div>
                      <div className='text-md font-normal text-[#00B98C]'>
                        ${paymentInfo?.discount}
                      </div>
                    </div>
                  )}
                  <Separator className='bg-[#322078]' />
                  <div className='flex justify-between mr-5 mb-4 mt-4'>
                    <div className='flex items-center gap-2'>
                      <div className='text-lg font-semibold'>Final amount</div>
                    </div>
                    <div className='text-lg font-semibold'>
                      ${paymentSuccessData?.amount}
                    </div>
                  </div>
                  <Separator className='bg-[#322078]' />
                  <Separator className='bg-[#322078]' />
                  <div className='flex justify-between mt-4'>
                    <ul className='list-square text-[12px] text-muted-foreground'>
                      <li>1. All amounts are in USD.</li>
                      <li>
                        <div>
                          2.{' '}
                          <a
                            href='/customer-guide#manual-deliveries'
                            className='text-primary'
                            target='_blank'
                          >
                            Delivery
                          </a>{' '}
                          dates are approximate. Files may experience delays due
                          to holidays, weekends, high workload, or audio issues.{' '}
                          <a href='/' className='text-primary'>
                            contact support.
                          </a>
                        </div>
                      </li>
                      <li>
                        3.{' '}
                        <a
                          href='/customer-guide#additional-charges'
                          className='text-primary'
                          target='_blank'
                        >
                          Additional charges{' '}
                        </a>
                        may apply for files with non-American accents, poor
                        audio quality, distortions, distant speakers, or high
                        background noise. A full refund will be issued if these
                        charges are unacceptable or if the file cannot be
                        transcribed.
                      </li>
                      <li>
                        4. For inquiries, please email{' '}
                        <a
                          href='mailto:support@scribie.com'
                          className='text-primary underline'
                        >
                          support@scribie.com{' '}
                        </a>{' '}
                        or call +1 866 941 4131.
                      </li>
                    </ul>
                  </div>
                </ScrollArea>
              ) : (
                <ScrollArea className='h-[57vh]'>
                  <Bill
                    paymentInfo={paymentInfo}
                    loadingAmount={loadingOrderUpdate}
                  />

                  {/* <div className='border-2 mt-3 mb-5 p-2'>
                    <div className='text-md font-medium'>Coupon</div>
                    <div className='flex w-full max-w-sm items-center space-x-2'>
                      <Input
                        type='text'
                        placeholder='Coupon code'
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                      />
                      {loadingCoupon ? (
                        <Button disabled className='w-[140px]'>
                          Please wait
                          <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
                        </Button>
                      ) : (
                        <Button
                          onClick={handleCouponApply}
                          className='w-[140px]'
                        >
                          Apply
                        </Button>
                      )}
                    </div>
                  </div> */}
                  <div className='mt-5'>
                    {(paymentInfo?.totalAmount as number) > creditsUsed &&
                      !billingEnabled &&
                      clientToken &&
                      activeStep === 3 && (
                        <div ref={braintreeRef}>
                          <DropIn
                            options={{
                              authorization: clientToken,
                              paypal: {
                                flow: 'vault',
                              },
                            }}
                            onInstance={(instance) => setInstance(instance)}
                          />
                        </div>
                      )}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        </div>
        <Separator />
      </div>
      <div className='flex items-center justify-end gap-5 p-4 sticky bottom-0 right-0 w-full bg-background border-t-2 border-customBorder'>
        {paymentSuccess ? (
          <Button
            className='w-[170px]'
            onClick={() => router.push('/files/in-progress')}
          >
            Back to Dashboard
          </Button>
        ) : (
          <>
            <Button
              className='w-[170px] border-primary border-2 text-primary rounded-[32px] transition-all duration-200 hover:opacity-90'
              variant='outline'
              onClick={
                activeStep === 1 ? () => router.push('/files/upload') : prevStep
              }
            >
              {activeStep === 1 ? 'Back to Dashboard' : 'Back'}
            </Button>
            {activeStep === 2 && (
              <>
                {loadingInstructions ? (
                  <Button
                    disabled
                    variant='outline'
                    className='w-[170px] border-primary border-2 text-primary '
                  >
                    <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                    Save
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleDefaultInstruction()}
                    variant='outline'
                    className='w-[170px] border-primary border-2 text-primary '
                  >
                    Save As Default
                  </Button>
                )}
              </>
            )}
            {loadingPay ? (
              <Button disabled className='w-[170px]'>
                Please wait
                <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
              </Button>
            ) : (
              <>
                {billingEnabled ? (
                  <Button
                    className='w-[170px]'
                    onClick={() => {
                      activeStep === totalSteps
                        ? handlePaymentMethodViaBilling()
                        : nextStep()
                    }}
                  >
                    {activeStep === totalSteps ? `Pay Now` : 'Next'}
                  </Button>
                ) : (
                  <>
                    {(paymentInfo?.totalAmount as number) > creditsUsed ? (
                      <Button
                        className='w-[170px]'
                        disabled={
                          activeStep === 3 && (!clientToken || !instance)
                        }
                        onClick={() => {
                          activeStep === totalSteps
                            ? handlePaymentMethod()
                            : nextStep()
                        }}
                      >
                        {activeStep === totalSteps ? 'Pay Now' : 'Next'}
                      </Button>
                    ) : (
                      <Button
                        className='w-[170px]'
                        onClick={() => {
                          activeStep === totalSteps
                            ? handlePaymentMethodViaCredits()
                            : nextStep()
                        }}
                      >
                        {activeStep === totalSteps
                          ? `Pay $${paymentInfo?.totalAmount} with credits`
                          : 'Next'}
                      </Button>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
      <BillBreakdownDialog
        open={billBreakdownOpen}
        onClose={() => setBillBreakdownOpen(false)}
        files={bills}
      />
    </div>
  )
}

export default TranscriptionOrder
