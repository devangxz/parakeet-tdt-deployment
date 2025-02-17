'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { User, Mail, Phone, Calendar, Timer, Loader2 } from 'lucide-react'
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { formSchema } from './controllers'
import { sendDemoRequestEmail } from '@/app/actions/static-mails/demo-request'
import { PhoneInput } from '@/components/phone-input/phone-input'
import Recaptcha from '@/components/recaptcha'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

const GetDemo = () => {
  const [captcha, setCaptcha] = useState<boolean>(false)
  const [loading, setLoading] = useState(false)
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      userEmail: '',
      phone: '',
      demoDate: new Date(),
      duration: 0,
      onetimeorder: true,
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (!captcha) {
        toast.error(`Please validate recaptcha.`)
        return
      }
      setLoading(true)
      const response = await sendDemoRequestEmail({
        Email: values.userEmail,
        Name: values.name,
        Duration: values.duration.toString(),
        Onetimeorder: values.onetimeorder ? '1' : '0',
        Phone: values.phone,
        DemoDate: values.demoDate.toLocaleString(),
      })

      if (response.success) {
        toast.success('Demo Request Submitted Successfully!')
      } else {
        toast.error(response.message)
      }
    } catch (error) {
      toast.error(`Failed to Submit Demo Request: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='w-full lg:grid lg:grid-cols-2'>
      <SideImage />
      <div className='flex items-center justify-center px-4 py-12 lg:px-8'>
        <div className='w-full max-w-[600px] space-y-5'>
          <div className='space-y-2.5 mb-6 text-center lg:text-left'>
            <div>
              <h1 className='text-4xl font-semibold tracking-tight'>
                Schedule a Demo
              </h1>
              <p className='mt-2 text-md text-muted-foreground'>
                Learn how Scribie can help you with your transcription needs
              </p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className='space-y-4'>
                <FormField
                  control={form.control}
                  name='name'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <div className='relative'>
                          <User className='absolute left-3 top-[12px] h-4 w-4 text-muted-foreground' />
                          <Input
                            className='pl-9'
                            placeholder='Enter name'
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className='grid grid-cols-2 gap-4'>
                  <FormField
                    control={form.control}
                    name='userEmail'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Email Address</FormLabel>
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

                  <FormField
                    control={form.control}
                    name='phone'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country & Phone</FormLabel>
                        <FormControl>
                          <div className='relative'>
                            <Phone className='absolute left-[82px] top-[50%] h-4 w-4 text-muted-foreground z-10 pointer-events-none transform -translate-y-1/2' />
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

                <div className='grid grid-cols-2 gap-4'>
                  <FormField
                    control={form.control}
                    name='demoDate'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferred Date and Time</FormLabel>
                        <FormControl>
                          <div className='relative'>
                            <Calendar className='absolute left-3 top-[12px] h-4 w-4 text-muted-foreground' />
                            <Input
                              type='datetime-local'
                              className='pl-9 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:my-auto'
                              {...field}
                              value={format(field.value, "yyyy-MM-dd'T'HH:mm")}
                              onChange={(e) =>
                                field.onChange(new Date(e.target.value))
                              }
                              placeholder='Select date and time'
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='duration'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (Minutes)</FormLabel>
                        <FormControl>
                          <div className='relative'>
                            <Timer className='absolute left-3 top-[12px] h-4 w-4 text-muted-foreground' />
                            <div className='flex items-center gap-2'>
                              <Input
                                type='number'
                                className='pl-9'
                                placeholder='Enter duration'
                                {...field}
                                value={field.value}
                                onChange={(e) =>
                                  field.onChange(
                                    parseInt(e.target.value, 10) || 0
                                  )
                                }
                              />
                              <div className='border border-input bg-background text-sm text-muted-foreground py-2 px-3 rounded-md'>
                                MIN
                              </div>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name='onetimeorder'
                  render={({ field }) => (
                    <FormItem className='space-y-3'>
                      <FormLabel>Is this a one time project?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value ? 'yes' : 'no'}
                          className='flex space-x-4'
                        >
                          <FormItem className='flex items-center space-x-2 space-y-0'>
                            <FormControl>
                              <RadioGroupItem value='yes' />
                            </FormControl>
                            <FormLabel className='font-normal'>Yes</FormLabel>
                          </FormItem>
                          <FormItem className='flex items-center space-x-2 space-y-0'>
                            <FormControl>
                              <RadioGroupItem value='no' />
                            </FormControl>
                            <FormLabel className='font-normal'>No</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Recaptcha setCaptcha={setCaptcha} />

              <Button
                disabled={loading || !captcha}
                type='submit'
                className='w-full'
              >
                {loading ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Please Wait
                  </>
                ) : (
                  <>
                    <Calendar className='mr-2 h-4 w-4' />
                    Schedule Demo
                  </>
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  )
}

export default GetDemo
