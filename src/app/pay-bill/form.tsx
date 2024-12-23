'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ReloadIcon } from '@radix-ui/react-icons'
import { Dropin } from 'braintree-web-drop-in'
import DropIn from 'braintree-web-drop-in-react'
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
      <div className='w-full lg:grid lg:min-h-[600px] lg:grid-cols-2 xl:min-h-[800px]'>
        <SideImage />
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
      </div>
    )
  }

  return (
    <>
      <div className='w-full lg:grid lg:min-h-[600px] lg:grid-cols-2 xl:min-h-[800px]'>
        <SideImage />
        {paymentSuccess ? (
          <div className='flex items-center justify-center py-12'>
            <div className='mx-auto grid w-[350px] gap-6'>
              <div className='grid gap-2 text-left'>
                <h1 className='text-4xl font-bold'>Successfully Paid!</h1>
                <p className='text-balance text-muted-foreground'>
                  You have successfully paid the amount of ${amount}
                </p>
              </div>
              <div className='ml-20'>
                <PaymentSuccessIcon />
              </div>
              <div className='flex justify-between mr-5'>
                <div className='flex items-center gap-2'>
                  <div className='text-md font-medium'>Paid By</div>
                </div>
                <div className='text-md font-normal'>{email}</div>
              </div>
              <div className='flex justify-between mr-5'>
                <div className='flex items-center gap-2'>
                  <div className='text-md font-medium'>Transaction ID</div>
                </div>
                <div className='text-md font-normal'>
                  {paymentSuccessData?.transactionId}
                </div>
              </div>
              <div className='flex justify-between mr-5'>
                <div className='flex items-center gap-2'>
                  <div className='text-md font-medium'>Payment Method</div>
                </div>
                <div className='text-md font-normal'>
                  {paymentSuccessData?.paymentMethod}
                </div>
              </div>
              {paymentSuccessData?.paymentMethod !== 'CREDITS' && (
                <div className='flex justify-between mr-5'>
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
              <div className='flex justify-between mr-5'>
                <div className='flex items-center gap-2'>
                  <div className='text-md font-medium'>Date</div>
                </div>
                <div className='text-md font-normal'>
                  {new Date().toLocaleDateString()}
                </div>
              </div>
              <Separator className='bg-[#322078]' />
              <div className='flex justify-between mr-5'>
                <div className='flex items-center gap-1'>
                  <div className='text-lg font-semibold'>Final amount</div>
                </div>
                <div className='text-lg font-semibold'>
                  ${paymentSuccessData?.amount}
                </div>
              </div>
              <Separator className='bg-[#322078]' />
            </div>
          </div>
        ) : (
          <div className='flex items-center justify-center py-12'>
            <div className='mx-auto grid w-[500px] gap-6'>
              <div className='grid gap-2 text-left'>
                <h1 className='text-4xl font-bold'>Welcome to Scribie!</h1>
                <p className='text-balance text-muted-foreground'>
                  Please pay your bill amount of ${amount}
                </p>
              </div>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className='space-y-6'
                >
                  <FormField
                    control={form.control}
                    name='fullName'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder='Full Name'
                            type='text'
                            {...field}
                          />
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
                          <Input placeholder='Email' {...field} />
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
                  {loadingPay ? (
                    <Button disabled className='w-full'>
                      <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                      Please wait
                    </Button>
                  ) : (
                    <Button type='submit' className='w-full'>
                      Pay ${amount}
                    </Button>
                  )}
                </form>
              </Form>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default PayBill
