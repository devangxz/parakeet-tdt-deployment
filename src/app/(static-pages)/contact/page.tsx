'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ReloadIcon } from '@radix-ui/react-icons'
import {
  Headset,
  Map,
  Laptop,
  MessageCircleMore,
  MessageSquareDot,
  Mail,
  User,
  Tag,
  Phone,
  CheckCircle,
  ArrowRight,
} from 'lucide-react'
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { formSchema } from './controller'
import { sendContactEmail } from '@/app/actions/static-mails/contactus'
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

export default function Page() {
  const [loading, setLoading] = useState(false)
  const [showChat, setShowChat] = useState(false)

  const contactInfo = [
    {
      icon: <MessageSquareDot className='h-5 w-5' />,
      title: 'Live Chat',
      description: 'Talk to us now',
      action: () => setShowChat(!showChat),
      actionText: 'Start Chat',
      highlight: true,
    },
    {
      icon: <Headset className='h-5 w-5' />,
      title: 'Sales Support',
      description: 'hello@scribie.com',
      secondaryInfo: '+1 866 941 4131',
    },
    {
      icon: <Laptop className='h-5 w-5' />,
      title: 'Technical Support',
      description: 'support@scribie.com',
      secondaryInfo: '+1 866 941 4131',
    },
    {
      icon: <Map className='h-5 w-5' />,
      title: 'Visit Us',
      description: '44 Tehama St',
      secondaryInfo: 'San Francisco, CA 94105',
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
      const result = await sendContactEmail({
        Name: values.name,
        Email: values.email,
        Subject: values.subject,
        QueryType: values.queryType,
        Phone: values.phone,
        Message: values.message ?? '',
      })
      if (result.success) {
        toast.success('Successfully submitted details')
        form.reset()
      } else {
        toast.error(result.message || 'Failed to submit details')
      }
    } catch (error) {
      toast.error(`Failed to submit details: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <div className='relative mx-auto max-w-7xl mt-16 sm:mt-20 md:mt-24 lg:mt-32 px-4 sm:px-6 lg:px-8 pb-10 lg:pb-20'>
        <div>
          <header className='text-center mb-8 sm:mb-12 lg:mb-16'>
            <h1 className='text-4xl md:text-5xl lg:text-6xl font-bold text-foreground max-w-3xl lg:max-w-5xl mx-auto leading-tight md:leading-[1.3] lg:leading-[1.1]'>
              How can we <span className='text-primary'>help you?</span>
            </h1>
            <p className='mt-4 sm:mt-6 lg:mt-8 text-gray-700 max-w-sm sm:max-w-xl lg:max-w-2xl mx-auto text-base sm:text-lg'>
              We&apos;re here to help and answer any question you might have
            </p>
          </header>

          <main className='mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
            {contactInfo.map((info, index) => (
              <div
                key={index}
                className={`bg-card p-6 rounded-xl shadow-lg border ${
                  info.highlight ? 'border-primary' : 'border-border'
                }`}
              >
                <div className='space-y-4'>
                  <div
                    className={`${
                      info.highlight ? 'bg-primary' : 'bg-primary/10'
                    } w-12 h-12 rounded-lg flex items-center justify-center`}
                  >
                    <div
                      className={info.highlight ? 'text-white' : 'text-primary'}
                    >
                      {info.icon}
                    </div>
                  </div>
                  <div>
                    <h3 className='font-semibold text-lg'>{info.title}</h3>
                    <p className='text-muted-foreground'>{info.description}</p>
                    {info.secondaryInfo && (
                      <p className='text-sm text-muted-foreground'>
                        {info.secondaryInfo}
                      </p>
                    )}
                  </div>
                  {info.action && (
                    <Button
                      onClick={info.action}
                      className='w-full justify-between group'
                      variant={info.highlight ? 'default' : 'ghost'}
                    >
                      {info.actionText}
                      <ArrowRight className='h-4 w-4 group-hover:translate-x-1 transition-transform' />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </main>
        </div>

        <section className='mt-20 sm:mt-28 md:mt-32 lg:mt-40 grid lg:grid-cols-5 gap-12'>
          <section className='lg:col-span-3'>
            <div className='space-y-4 mb-6'>
              <h2 className='text-3xl sm:text-4xl font-bold text-foreground'>
                Get in touch
              </h2>
              <p className='text-gray-700 text-base sm:text-lg'>
                Fill out the form and we&apos;ll get back to you within 24 hours
              </p>
            </div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className='space-y-4'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                    <FormField
                      control={form.control}
                      name='name'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <div className='relative'>
                              <User className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                              <Input
                                className='pl-10'
                                placeholder='Enter name'
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
                              <Mail className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                              <Input
                                className='pl-10'
                                placeholder='Enter email address'
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                    <FormField
                      control={form.control}
                      name='subject'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject</FormLabel>
                          <FormControl>
                            <div className='relative'>
                              <Tag className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                              <Input
                                className='pl-10'
                                placeholder='Enter subject'
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
                      name='phone'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <div className='relative'>
                              <Phone className='absolute left-[82px] top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none' />
                              <PhoneInput
                                placeholder='Enter phone number'
                                {...field}
                                className='flex gap-2 [&>input]:pl-9'
                              />
                            </div>
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
                        <FormLabel>I am a</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className='flex space-x-4'
                          >
                            <FormItem className='flex items-center space-x-2 space-y-0'>
                              <FormControl>
                                <RadioGroupItem value='customer' />
                              </FormControl>
                              <FormLabel className='font-normal'>
                                Customer
                              </FormLabel>
                            </FormItem>
                            <FormItem className='flex items-center space-x-2 space-y-0'>
                              <FormControl>
                                <RadioGroupItem value='transcriber' />
                              </FormControl>
                              <FormLabel className='font-normal'>
                                Transcriber
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
                        <FormLabel>Message</FormLabel>
                        <FormControl>
                          <div className='relative'>
                            <MessageCircleMore className='absolute left-3 top-3 h-4 w-4 text-muted-foreground' />
                            <Textarea
                              rows={5}
                              className='pl-10 resize-none'
                              placeholder='Tell us how we can help...'
                              {...field}
                              value={field.value || ''}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  disabled={loading}
                  type='submit'
                  size='lg'
                  className='w-full mt-7'
                >
                  {loading ? (
                    <>
                      <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                      Please wait...
                    </>
                  ) : (
                    <>
                      <CheckCircle className='mr-2 h-4 w-4' />
                      Send Message
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </section>

          <aside className='lg:col-span-2'>
            <div className='bg-card rounded-xl px-8 py-[25px] border space-y-5'>
              <div>
                <h3 className='text-xl font-semibold mb-4'>
                  Why Choose Scribie?
                </h3>
                <div className='space-y-4'>
                  <div className='flex items-start space-x-3'>
                    <div className='mt-1'>
                      <CheckCircle className='h-5 w-5 text-primary' />
                    </div>
                    <div>
                      <h4 className='font-medium'>AI-Powered Accuracy</h4>
                      <p className='text-sm text-muted-foreground'>
                        Advanced technology combined with human expertise for
                        superior results
                      </p>
                    </div>
                  </div>
                  <div className='flex items-start space-x-3'>
                    <div className='mt-1'>
                      <CheckCircle className='h-5 w-5 text-primary' />
                    </div>
                    <div>
                      <h4 className='font-medium'>Enterprise-Grade Security</h4>
                      <p className='text-sm text-muted-foreground'>
                        Your data is protected with industry-leading security
                        measures
                      </p>
                    </div>
                  </div>
                  <div className='flex items-start space-x-3'>
                    <div className='mt-1'>
                      <CheckCircle className='h-5 w-5 text-primary' />
                    </div>
                    <div>
                      <h4 className='font-medium'>24/7 Support</h4>
                      <p className='text-sm text-muted-foreground'>
                        Round-the-clock assistance for all your transcription
                        needs
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className='border-t pt-5'>
                <h3 className='text-xl font-semibold mb-4'>Our Commitment</h3>
                <p className='text-sm text-muted-foreground mb-6'>
                  We&apos;ve been empowering businesses with AI-powered
                  transcription services since 2008, maintaining the highest
                  standards of accuracy and reliability.
                </p>
                <div className='grid grid-cols-2 gap-4 text-center'>
                  <div className='bg-secondary rounded-lg p-4'>
                    <div className='text-2xl font-bold text-primary'>99.9%</div>
                    <div className='text-sm text-muted-foreground'>
                      Accuracy Rate
                    </div>
                  </div>
                  <div className='bg-secondary rounded-lg p-4'>
                    <div className='text-2xl font-bold text-primary'>16Y+</div>
                    <div className='text-sm text-muted-foreground'>
                      Experience
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </section>
      </div>

      {showChat && <BrevoChatWidget />}
    </section>
  )
}
