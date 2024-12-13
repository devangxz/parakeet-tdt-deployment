/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'
import { ReloadIcon } from '@radix-ui/react-icons'
import axios, { AxiosError } from 'axios'
import { Dropin } from 'braintree-web-drop-in'
import DropIn from 'braintree-web-drop-in-react'
import { Check, MoveRight } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'

import Bill from './bill'
import PaymentSuccessIcon from '../payment-success'
import { CustomOrderOptions } from '@/app/(dashboard)/payments/invoice/[invoice_id]/components/custom-order-options'
import { updateFilesInfo } from '@/app/actions/files/update-info'
import { getInvoiceDetails } from '@/app/actions/invoice/[invoiceId]'
import { updateOrderOptions } from '@/app/actions/order/update-order-options'
import { applyDiscount } from '@/app/actions/payment/apply-discount'
import { checkout } from '@/app/actions/payment/checkout'
import { checkoutViaCredits } from '@/app/actions/payment/checkout-via-credits'
import { getClientTokenAction } from '@/app/actions/payment/client-token'
import { getRISDataAction } from '@/app/actions/ris-data'
import BillBreakdownDialog from '@/components/bill-breakdown'
import { Icons } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { RUSH_ORDER_PRICE } from '@/constants'
import { handleBillingPaymentMethod } from '@/utils/billingPaymentHandler'

interface File {
  fileId: string
  filename: string
  risData: string
  dueDate: Date | undefined
  folderName: string
  templateId: string
  instructions: string
  cost: number
}

interface Payment {
  fileSize: number
  service: string
  baseRate: number
  discount: number
  totalAmount: number
  invoiceId: string
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

const CustomFormatOrder = ({ invoiceId }: { invoiceId: string }) => {
  const router = useRouter()
  const { data: session, status } = useSession()
  const steps = [
    {
      label: 'Supporting Documents',
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
  const [files, setFiles] = useState<File[]>([])
  const [clientToken, setClientToken] = useState<string | null>(null)
  const [instance, setInstance] = useState<Dropin | null>(null)
  const [paymentInfo, setPaymentInfo] = useState<Payment | null>(null)
  const [loadingPay, setLoadingPay] = useState<boolean>(false)
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [paymentSuccessData, setPaymentSuccessData] =
    useState<PaymentSuccessData | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [creditsUsed, setCreditsUsed] = useState<number>(0)
  const [disableNextButton, setDisableNextButton] = useState(false)
  const [rushOrderEnable, setRushOrderEnable] = useState(false)
  const [rushOrderPrice, setRushOrderPrice] = useState<number>(RUSH_ORDER_PRICE)
  const [couponCode, setCouponCode] = useState<string>('')
  const [loadingCoupon, setLoadingCoupon] = useState<boolean>(false)
  const [billBreakdownOpen, setBillBreakdownOpen] = useState<boolean>(false)
  const [bills, setBills] = useState<
    { name: string; amount: number; duration: number }[]
  >([])
  const [billingEnabled, setBillingEnabled] = useState<boolean>(false)

  useEffect(() => {
    const fetchOrderInformation = async () => {
      setIsLoading(true)

      try {
        const tokenResponse = await getClientTokenAction()
        const response = await getInvoiceDetails(
          invoiceId,
          'TRANSCRIPTION_FORMATTING'
        )

        if (!response.responseData) {
          throw new Error('No response data received')
        }

        const fetchedFiles = response.responseData.files.map((file: any) => ({
          fileId: file.fileId,
          filename: file.File.filename,
          risData: JSON.stringify(file.File.customFormattingDetails),
          dueDate: file.File.customInstructions
            ? JSON.parse(file.File.customInstructions).dueDate
            : undefined,
          folderName: '',
          templateId: file.File.customInstructions
            ? JSON.parse(file.File.customInstructions).templateId
            : '',
          instructions: file.File.customInstructions
            ? JSON.parse(file.File.customInstructions).instructions
            : '',
          cost: file.price,
        }))
        setCreditsUsed(response.responseData.creditsUsed)
        setBillingEnabled(response.responseData.isBillingEnabledForCustomer)
        setFiles(fetchedFiles)
        setRushOrderPrice(response.responseData.rates.rush_order)
        setPaymentInfo({
          fileSize:
            response.responseData.files.reduce(
              (
                total: number,
                file: {
                  File: {
                    duration: number
                  }
                }
              ) => total + file.File.duration,
              0
            ) / 60,
          service: 'Transcribe and Custom Format',
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
        setTemplates(templateData)
        const bills = response.responseData.files.map(
          (file: {
            File: { filename: string; duration: number }
            price: number
          }) => ({
            name: file.File.filename,
            amount: file.price,
            duration: file.File.duration,
          })
        )
        setBills(bills)
        setClientToken(tokenResponse.clientToken || null)
        const orderOptions = JSON.parse(
          response.responseData.invoice.options || '{}'
        )
        if (orderOptions.exd === 1) {
          setRushOrderEnable(true)
        } else {
          setRushOrderEnable(false)
        }
      } catch (err) {
        console.error('Failed to fetch pending files:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrderInformation()
  }, [status])

  const handleTemplateChange = async (fileId: string, newValue: string) => {
    const templateName = templates.find(
      (template) => template.id == Number(newValue)
    )?.name

    setFiles((prevFiles) =>
      prevFiles.map((file) =>
        file.fileId === fileId ? { ...file, templateId: newValue } : file
      )
    )

    if (
      session?.user?.organizationName.toLocaleLowerCase() === 'remotelegal' &&
      templateName?.toLowerCase() === 'deposition'
    ) {
      const toastId = toast.loading(`Updating RIS Data, please wait...`)
      try {
        setDisableNextButton(true)
        const response = await getRISDataAction(fileId, templateName)

        if (response.success) {
          const tId = toast.success(`Successfully updated RIS data`)
          toast.dismiss(tId)
          toast.dismiss(toastId)
          setDisableNextButton(false)
          setFiles((prevFiles) =>
            prevFiles.map((file) =>
              file.fileId === fileId
                ? { ...file, risData: JSON.stringify(response.data) }
                : file
            )
          )
        } else {
          toast.error(`Failed to update ris data`)
          setDisableNextButton(false)
          toast.dismiss(toastId)
        }
      } catch (error) {
        toast.error(`Failed to update ris data`)
        setDisableNextButton(false)
        toast.dismiss(toastId)
      }
    }
  }

  const handleDueDateChange = (fileId: string, newDate: Date) => {
    setFiles((prevFiles) =>
      prevFiles.map((file) =>
        file.fileId === fileId ? { ...file, dueDate: newDate } : file
      )
    )
  }

  const handleRISDataChange = (fileId: string, data: string) => {
    setFiles((prevFiles) =>
      prevFiles.map((file) =>
        file.fileId === fileId ? { ...file, risData: data } : file
      )
    )
  }

  const handleInstructionsChange = (
    fileId: string,
    newInstructions: string
  ) => {
    setFiles((prevFiles) =>
      prevFiles.map((file) =>
        file.fileId === fileId
          ? { ...file, instructions: newInstructions }
          : file
      )
    )
  }

  const handlePaymentMethod = async () => {
    if (!instance) return

    try {
      const { nonce } = await instance.requestPaymentMethod()
      setLoadingPay(true)

      const response = await checkout({
        paymentMethodNonce: nonce,
        invoiceId,
        orderType: 'TRANSCRIPTION_FORMATTING',
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

  const handlePaymentMethodViaCredits = async () => {
    try {
      setLoadingPay(true)

      const response = await checkoutViaCredits({
        invoiceId,
        orderType: 'TRANSCRIPTION_FORMATTING',
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
      'TRANSCRIPTION_FORMATTING',
      invoiceId,
      setPaymentSuccessData,
      setPaymentSuccess,
      setLoadingPay
    )
  }

  const nextStep = async () => {
    if (activeStep === steps.length) {
      return null
    }

    if (activeStep === 2) {
      try {
        const response = await updateFilesInfo(
          files.map((file) => ({
            ...file,
            dueDate: file.dueDate?.toISOString() ?? '',
          }))
        )

        if (response.success) {
          const tId = toast.success(`Successfully updated files information`)
          toast.dismiss(tId)
        } else {
          toast.error(`Failed to update file information`)
        }
      } catch (error) {
        toast.error(`Failed to update file information`)
      }
    }
    const fileMissingTemplateName = files.find((file) => !file.templateId)
    if (fileMissingTemplateName) {
      toast.error('Please select a template for all files')
    } else {
      setActiveStep((prevStep) => prevStep + 1)
    }
  }

  const handleRushOrder = async () => {
    setRushOrderEnable((prevRushOrderEnable) => !prevRushOrderEnable)
    try {
      const response = await updateOrderOptions(
        invoiceId,
        'exd',
        !rushOrderEnable ? '1' : '0'
      )

      if (response.success) {
        const tId = toast.success(
          `Successfully ${
            !rushOrderEnable ? 'Enabled' : 'Disabled'
          } rush order option`
        )
        toast.dismiss(tId)
        setPaymentInfo((prevPaymentInfo: Payment | null) => ({
          ...prevPaymentInfo!,
          totalAmount: response.invoice?.amount ?? 0,
          creditsUsed: response.creditsUsed ?? 0,
        }))
        setCreditsUsed(response.creditsUsed ?? 0)
      } else {
        toast.error(`Failed to update rush order option`)
      }
    } catch (error) {
      toast.error(`Failed to update rush order option`)
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
      setPaymentInfo((prevPaymentInfo: Payment | null) => ({
        ...prevPaymentInfo!,
        discount: response.totalDiscount ?? 0,
      }))
      setLoadingCoupon(false)
    } catch (error) {
      toast.error(`Failed to add free credits`)
      setLoadingCoupon(false)
    }
  }

  const prevStep = () => {
    setActiveStep((prevStep) => prevStep - 1)
  }

  const totalSteps = steps.length

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
      <div className='w-full max-w-[48rem] mx-auto px-4 overflow-y-auto'>
        <div className='flex justify-between gap-6'>
          {steps.map(({ step, label }, index) => (
            <div key={step}>
              <div className={`flex items-center justify-center gap-3`}>
                <div
                  className={`rounded-full p-1 ${
                    activeStep >= step ? 'bg-[#36F0C3]' : 'bg-violet-100'
                  }`}
                >
                  <Check className='h-4 w-4 font-bold' />
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
            <div className='w-[100%] md:w-[50%] p-5 lg:p-10'>
              <ScrollArea className='h-[62vh]'>
                {/* {session?.user?.organizationName.toLocaleLowerCase() !==
                  'remotelegal' && (
                    <>
                      {' '}
                      <div className='flex justify-between flex-wrap'>
                        <div className='flex items-center gap-2'>
                          <Switch
                            id='exd-switch'
                            checked={rushOrderEnable}
                            onCheckedChange={handleRushOrder}
                          />
                          <div className='text-md font-medium ml-3'>
                            Rush Order
                          </div>
                        </div>
                        <div className='text-md font-normal'>{`+${rushOrderPrice.toFixed(
                          2
                        )} / min`}</div>
                      </div>
                      <div className='mt-3 mb-3 font-normal text-sm text-[#8A8A8A]'>
                        All files are prioritised for completion. Get your files
                        delivered up to 3x faster. Files exceeding a duration of 2
                        hours will require more than 12 hours to process. The
                        lengthier the file, the longer is the turnaround time.
                        Also, files with audio issues may be delayed.
                      </div>
                      <Separator />
                    </>
                  )} */}

                {files.map((file, index) => (
                  <CustomOrderOptions
                    fileId={file.fileId}
                    key={index}
                    filename={file.filename}
                    risData={file.risData}
                    folderName={file.folderName}
                    templateId={file.templateId}
                    dueDate={file.dueDate}
                    onTemplateChange={handleTemplateChange}
                    onDueDateChange={handleDueDateChange}
                    onViewRISData={handleRISDataChange}
                    isInitiallyOpen={index === 0}
                    templates={templates}
                    organizationName={session?.user?.organizationName ?? 'none'}
                  />
                ))}
              </ScrollArea>
            </div>
          )}

          {activeStep === 2 && (
            <div className='w-[100%] md:w-[50%] p-5 lg:p-10'>
              <div className='text-lg text-primary font-medium mb-3'>
                Provide instructions
              </div>
              <ScrollArea className=''>
                {files.map((file, index) => (
                  <>
                    <div
                      className='flex-col lg:flex lg:flex-row justify-between ml-3 mr-5 mt-5'
                      key={index}
                    >
                      <div className='flex items-center gap-2 mt-[-20px]'>
                        <div>
                          <div className='text-md font-medium'>
                            {file.filename}
                          </div>
                          <div className='text-sm text-muted-foreground w-[200px] mt-5'>
                            <div>
                              Due date{' '}
                              <span className='text-black font-medium'>
                                {file.dueDate
                                  ? new Date(file.dueDate).toDateString()
                                  : 'N/A'}
                              </span>
                            </div>
                            <div className='mt-2'>
                              Cost{' '}
                              <span className='text-black font-medium'>
                                ${file.cost}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className='text-md font-normal mt-5 lg:mt-0 w-[350px]'>
                        <div className='text-md font-medium'>Instructions</div>
                        <Textarea
                          placeholder='Enter here'
                          value={file.instructions}
                          onChange={(e) =>
                            handleInstructionsChange(
                              file.fileId,
                              e.target.value
                            )
                          }
                          rows={4}
                          className='w-[345px]'
                        />
                      </div>
                    </div>
                    <Separator className='mt-3' />
                  </>
                ))}
              </ScrollArea>
            </div>
          )}

          {activeStep === 3 && (
            <div className='w-[100%] md:w-[50%] p-5 lg:p-10'>
              <div className='text-lg text-primary font-medium mb-10'>
                Payment terms
              </div>
              <ScrollArea className=''>
                <ol className='text-md text-muted-foreground mt-4 ml-2'>
                  <li className=''>
                    1. <b>Rate:</b> The client will be charged at a rate of $
                    {paymentInfo ? paymentInfo?.baseRate.toFixed(2) : 0} per
                    audio minute.
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

          <div className='w-[100%] md:w-[50%] bg-muted p-5 lg:p-10 hidden lg:block'>
            <div className='pl-10'>
              <div className='flex justify-between items-center'>
                <div className='text-lg text-primary font-medium mb-10'>
                  Your bill
                </div>
                <div
                  className='text-md cursor-pointer text-black font-medium mb-10 mr-5 underline'
                  onClick={() => setBillBreakdownOpen(true)}
                >
                  View invoice
                </div>
              </div>
              {paymentSuccess ? (
                <ScrollArea className='h-[57vh]'>
                  <div className='flex flex-col justify-center items-center mb-6 mt-[-40px]'>
                    <PaymentSuccessIcon />
                    <div className='text-lg font-medium mr-5 mt-[-40px]'>
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
                      <div className='text-md font-medium'>Service</div>
                    </div>
                    <div className='text-md font-normal'>
                      {paymentInfo?.service}
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
                  <Bill paymentInfo={paymentInfo} />
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
                        <DropIn
                          options={{
                            authorization: clientToken,
                            paypal: {
                              flow: 'vault',
                            },
                          }}
                          onInstance={(instance) => setInstance(instance)}
                        />
                      )}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        </div>
        <Separator />
      </div>
      <div className='flex justify-end gap-10 mt-6 px-10'>
        {paymentSuccess ? (
          <Button onClick={() => router.push('/files/in-progress')}>
            Back to Dashboard
          </Button>
        ) : (
          <>
            {activeStep !== 1 && (
              <Button
                className='w-[200px] text-primary'
                variant='outline'
                onClick={prevStep}
              >
                Back
              </Button>
            )}
            {loadingPay ? (
              <Button disabled className='w-[200px]'>
                Please wait
                <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
              </Button>
            ) : (
              <>
                {billingEnabled ? (
                  <Button
                    className='w-[200px]'
                    onClick={() => {
                      activeStep === totalSteps
                        ? handlePaymentMethodViaBilling()
                        : nextStep()
                    }}
                  >
                    {activeStep === totalSteps ? 'Pay Now' : 'Next'}
                  </Button>
                ) : (
                  <>
                    {(paymentInfo?.totalAmount as number) > creditsUsed ? (
                      <Button
                        className='w-[200px]'
                        disabled={
                          disableNextButton ||
                          (activeStep === 3 && (!clientToken || !instance))
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
                        className='w-[200px]'
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

export default CustomFormatOrder
