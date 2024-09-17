'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { ReloadIcon } from '@radix-ui/react-icons'
import { Headset, Map, MessageCircleMore, MessageSquareDot } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { formSchema } from './controller'
import BrevoChatWidget from '@/components/chat-widget'
import { PhoneInput } from '@/components/phone-input/phone-input'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { BACKEND_URL } from '@/constants'

export default function Page() {
  const [loading, setLoading] = useState(false)
  const [showChat, setShowChat] = useState<boolean>(false)
  const capsules = [
    {
      Icon: MessageSquareDot,
      Content: () => (
        <Button onClick={() => setShowChat(!showChat)}>Live Chat</Button>
      ),
    },
    {
      Icon: MessageCircleMore,
      Content: () => (
        <div className='flex flex-col items-center'>
          <p className='my-1 text-lg font-semibold'>Support Team</p>
          <p>support@scribie.com</p>
          <p>+1 866 941 4131</p>
        </div>
      ),
    },
    {
      Icon: Headset,
      Content: () => (
        <div className='flex flex-col items-center'>
          <p className='my-1 text-lg font-semibold'>Sales Team</p>
          <p>hello@scribie.com</p>
          <p>+1 866 941 4131</p>
        </div>
      ),
    },
    {
      Icon: Map,
      Content: () => (
        <div className='flex flex-col items-center'>
          <p className='my-1 text-lg font-semibold'>Address</p>
          <p className='text-center'>44 Tehama St, San Francisco, CA 94105</p>
        </div>
      ),
    },
  ]
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      subject: '',
      queryType: '',
      phone: '',
      message: '',
    },
  })
  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setLoading(true)
      const response = await fetch(`${BACKEND_URL}/contactus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Name: values.name,
          Email: values.email,
          Subject: values.subject,
          QueryType: values.queryType,
          Phone: values.phone,
          Message: values.message,
        }),
      })
      const { message } = await response.json()
      toast.success(message)
      setLoading(false)
      toast.success('Successfully submitted Details')
    } catch (error) {
      setLoading(false)
      toast.error(`Failed to submit details: ${error}`)
    }
  }
  if (loading) return <div>Loading...</div>
  return (
    <div>
      <div className='bg-muted px-7 lg:px-[10%] block py-[5rem]'>
        <div className='grid gap-2 text-center'>
          <h1 className='text-4xl font-bold'>Got a question?</h1>
          <p className='text-balance text-muted-foreground'>
            We&apos;d love to talk about how we can help you.
          </p>
        </div>
        <div className='flex flex-col md:flex-row gap-5 items-center md:items-stretch justify-around pt-[3rem] md:pt-[5rem]'>
          {capsules.map((item, index) => {
            const { Icon, Content } = item
            return <Capsule key={index} Icon={Icon} Content={Content} />
          })}
        </div>
      </div>
      <div className='py-[5rem] px-7 lg:px-[10%] space-y-4'>
        <p className='text-center text-sm text-slate-400 font-semibold'>
          LEAVE A MESSAGE
        </p>
        <p className='text-center text-4xl font-semibold'>How can we help?</p>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-3'>
            <div className='flex flex-col sm:flex-row gap-x-8 gap-y-4'>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem className='w-full sm:w-[50%]'>
                    <FormLabel className='text-sm text-slate-400'>
                      First Name
                    </FormLabel>
                    <FormControl>
                      <Input required placeholder='Your Name' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='email'
                render={({ field }) => (
                  <FormItem className='w-full sm:w-[50%]'>
                    <FormLabel className='text-sm text-slate-400'>
                      Your email address
                    </FormLabel>
                    <FormControl>
                      <Input placeholder='Your Email Address' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className='flex flex-col sm:flex-row gap-x-8 gap-y-4'>
              <FormField
                control={form.control}
                name='subject'
                render={({ field }) => (
                  <FormItem className='w-full sm:w-[50%]'>
                    <FormLabel className='text-sm text-slate-400'>
                      Subject
                    </FormLabel>
                    <FormControl>
                      <Input placeholder='Subject' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='phone'
                render={({ field }) => (
                  <FormItem className='w-full sm:w-[50%]'>
                    <FormLabel className='text-sm text-slate-400'>
                      Country & Phone
                    </FormLabel>
                    <FormControl>
                      <PhoneInput
                        placeholder='Your Phone Number'
                        {...field}
                        className='space-x-2 not-rounded'
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='queryType'
              render={({ field }) => (
                <FormItem className='space-y-3'>
                  <FormLabel className='text-sm text-slate-400'>
                    Query Type
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className='flex space-x-2'
                    >
                      <FormItem className='flex items-center space-x-1 space-y-0'>
                        <FormControl>
                          <RadioGroupItem value='customer' />
                        </FormControl>
                        <FormLabel className='font-normal'>Customer</FormLabel>
                      </FormItem>
                      <FormItem className='flex items-center space-x-1 space-y-0'>
                        <FormControl>
                          <RadioGroupItem value='transcriber' />
                        </FormControl>
                        <FormLabel className='font-normal'>
                          Transciber
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='message'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-sm text-slate-400'>
                    How can we help you?
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      rows={5}
                      placeholder='Hi there, I would like to...'
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {false ? (
              <Button disabled className='w-full'>
                <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                Submit
              </Button>
            ) : (
              <Button type='submit'>Submit</Button>
            )}
            <p className='text-sm text-slate-400 font-light'>
              We&apos;ll get back to you in 1-2 business days.
            </p>
          </form>
        </Form>
      </div>
      {showChat && <BrevoChatWidget />}
    </div>
  )
}

function Capsule({
  Icon,
  Content,
}: {
  Icon: React.ElementType
  Content: () => JSX.Element
}) {
  return (
    <div className='space-y-4 flex flex-col w-[180px] lg:w-[250px] items-center bg-white p-[2rem] rounded-lg'>
      <Icon />
      <Content />
    </div>
  )
}
