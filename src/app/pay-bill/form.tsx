'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ReloadIcon } from '@radix-ui/react-icons'
import { Dropin } from 'braintree-web-drop-in'
import DropIn from 'braintree-web-drop-in-react'
import { Mail, Wallet } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { getClientToken, payBill } from '@/app/actions/pay-bill'
import PaymentSuccessIcon from '@/components/payment-success'
import SideImage from '@/components/side-image'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'

interface PaymentSuccessData {
  transactionId: string
  paymentMethod: string
  pp_account?: string
  cc_last4?: string
  amount: number
}

const formSchema = z.object({
  fullName: z.string().nonempty({ message: 'Name should not be empty' }),
  email: z
    .string({
      required_error: 'Email is required',
    })
    .email(),
})

const PayBill = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [clientToken, setClientToken] = useState<string | null>(null)
  const [instance, setInstance] = useState<Dropin | null>(null)
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false)
  const [paymentSuccessData, setPaymentSuccessData] =
    useState<PaymentSuccessData | null>(null)
  const [loadingPay, setLoadingPay] = useState<boolean>(false)

  const searchParams = useSearchParams()
  const fullName = searchParams?.get('full_name')
  const email = searchParams?.get('email')
  const amount = searchParams?.get('amount')

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: fullName ?? '',
      email: email ?? '',
    },
  })

  useEffect(() => {
    const fetchBraintreeToken = async () => {
      setIsLoading(true)
      try {
        const response = await getClientToken()
        if (response.success && response.clientToken) {
          setClientToken(response.clientToken)
        }
        setIsLoading(false)
      } catch (err) {
        console.error('Failed to fetch client token:', err)
      }
    }

    fetchBraintreeToken()
  }, [])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await handlePaymentMethod(values)
  }

  const handlePaymentMethod = async (values: z.infer<typeof formSchema>) => {
    if (instance) {
      try {
        const { nonce } = await instance.requestPaymentMethod()
        setLoadingPay(true)

        const response = await payBill({
          paymentMethodNonce: nonce,
          email: values.email,
          amount: amount!,
          fullName: values.fullName,
        })

        setLoadingPay(false)

        if (response.success) {
          setPaymentSuccessData({
            transactionId: response.transactionId ?? '',
            paymentMethod: response.paymentMethod ?? '',
            pp_account: response.pp_account ?? '',
            cc_last4: response.cc_last4 ?? '',
            amount: Number(amount ?? 0),
          })
          setPaymentSuccess(true)
        } else {
          alert('Payment failed: ' + response.message)
        }
      } catch (err) {
        setLoadingPay(false)
        console.error('Error processing payment:', err)
      }
    }
  }

  if (isLoading) {
    return (
      <div className='w-full lg:grid lg:grid-cols-2'>
        <SideImage />
        <div className='flex items-center justify-center px-4 py-12 lg:px-8'>
          <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='w-full lg:grid lg:grid-cols-2'>
      <SideImage />
      <div className='flex items-center justify-center px-4 py-12 lg:px-8'>
        <div className='w-full max-w-sm space-y-5'>
          {paymentSuccess ? (
            <div className='space-y-5'>
              <div className='space-y-2.5 text-center lg:text-left'>
                <h1 className='text-4xl font-semibold tracking-tight'>
                  Payment Successful
                </h1>
                <p className='mt-2 text-md text-gray-700'>
                  Thank you for your payment of ${amount}
                </p>
              </div>

              <div className='mt-6'>
                <PaymentSuccessIcon />
              </div>

              <div className='space-y-3'>
                <div className='flex justify-between'>
                  <span className='text-sm font-medium'>Paid By</span>
                  <span className='text-sm'>{email}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-sm font-medium'>Transaction ID</span>
                  <span className='text-sm'>
                    {paymentSuccessData?.transactionId}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-sm font-medium'>Payment Method</span>
                  <span className='text-sm'>
                    {paymentSuccessData?.paymentMethod}
                  </span>
                </div>
                {paymentSuccessData?.paymentMethod !== 'CREDITS' && (
                  <div className='flex justify-between'>
                    <span className='text-sm font-medium'>
                      {paymentSuccessData?.cc_last4 ? 'Card ending' : 'PP'}
                    </span>
                    <span className='text-sm'>
                      {paymentSuccessData?.cc_last4 ||
                        paymentSuccessData?.pp_account}
                    </span>
                  </div>
                )}
                <div className='flex justify-between'>
                  <span className='text-sm font-medium'>Date</span>
                  <span className='text-sm'>
                    {new Date().toLocaleDateString()}
                  </span>
                </div>

                <Separator className='my-4' />

                <div className='flex justify-between'>
                  <span className='text-base font-semibold'>Final amount</span>
                  <span className='text-base font-semibold'>
                    ${paymentSuccessData?.amount}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className='space-y-2.5 text-center lg:text-left'>
                <h1 className='text-4xl font-semibold tracking-tight'>
                  Make Payment
                </h1>
                <p className='mt-2 text-md text-gray-700'>
                  Please complete your payment of ${amount}
                </p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <div className='space-y-4'>
                    <FormField
                      control={form.control}
                      name='fullName'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <div className='relative'>
                              <Mail className='absolute left-3 top-[12px] h-4 w-4 text-muted-foreground' />
                              <Input
                                className='pl-9'
                                placeholder='Enter your full name'
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name='email'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <div className='relative'>
                              <Mail className='absolute left-3 top-[12px] h-4 w-4 text-muted-foreground' />
                              <Input
                                className='pl-9'
                                placeholder='Enter email address'
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {clientToken && (
                      <div>
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

                  <Button
                    disabled={loadingPay}
                    type='submit'
                    className='w-full mt-7'
                  >
                    {loadingPay ? (
                      <>
                        <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                        Please wait
                      </>
                    ) : (
                      <>
                        <Wallet className='mr-2 h-4 w-4' />
                        Pay ${amount}
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default PayBill
