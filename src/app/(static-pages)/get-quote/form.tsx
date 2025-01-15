'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ReloadIcon } from '@radix-ui/react-icons'
import { Mail, User, Phone, Timer, MessageSquare, FileSpreadsheet } from 'lucide-react'
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { formSchema } from './controllers'
import { sendQuoteRequestEmail } from '@/app/actions/static-mails/quote-request'
import { PhoneInput } from '@/components/phone-input/phone-input'
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

const GetQuote = () => {
  const [loading, setLoading] = useState(false)
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      userEmail: '',
      phone: '',
      duration: 0,
      strictVerbatim: false,
      accentedSpeakers: false,
      noisyAudio: false,
      srtVtt: false,
      customFormatting: false,
      recurringOrders: false,
      additionalInfo: '',
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setLoading(true)
      const requestBody = {
        Name: values.name,
        UserEmail: values.userEmail,
        Phone: values.phone,
        Duration: Number(values.duration),
        message: values.additionalInfo,
        options: [
          ...(values.strictVerbatim ? [{ 'Strict Verbatim': true }] : []),
          ...(values.accentedSpeakers ? [{ 'Accented Speakers': true }] : []),
          ...(values.noisyAudio ? [{ 'Noisy Audio': true }] : []),
          ...(values.srtVtt ? [{ 'Srt Vtt': true }] : []),
          ...(values.customFormatting ? [{ 'Custom Formatting': true }] : []),
          ...(values.recurringOrders ? [{ 'Recurring Orders': true }] : []),
        ],
      }
      const response = await sendQuoteRequestEmail(requestBody)
      if (response.success) {
        toast.success('Quotation request submitted successfully')
        form.reset()
      } else {
        toast.error('Failed to submit quotation request')
      }
    } catch (error) {
      toast.error(`Failed to submit quotation request: ${error}`)
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
                Get a Quote
              </h1>
              <p className='mt-2 text-md text-gray-700'>
                Get a customized quote for your transcription project
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
                            placeholder='Enter Name'
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
                              placeholder='Eneter phone number'
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
                  name='duration'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (hours)</FormLabel>
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
                            <div className='border-2 text-primary py-1 px-2 rounded-lg font-semibold'>
                              HRS
                            </div>
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormItem>
                  <FormLabel>Additional Options</FormLabel>
                  <div className='rounded-lg border px-3 py-2'>
                    <div className='grid grid-cols-2 gap-y-4 gap-x-8'>
                      <FormField
                        control={form.control}
                        name='strictVerbatim'
                        render={({ field }) => (
                          <FormItem className='flex flex-row items-center justify-between space-x-2'>
                            <FormLabel className='text-sm font-normal'>
                              Strict Verbatim
                            </FormLabel>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name='accentedSpeakers'
                        render={({ field }) => (
                          <FormItem className='flex flex-row items-center justify-between space-x-2'>
                            <FormLabel className='text-sm font-normal'>
                              Accented Speakers
                            </FormLabel>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name='noisyAudio'
                        render={({ field }) => (
                          <FormItem className='flex flex-row items-center justify-between space-x-2'>
                            <FormLabel className='text-sm font-normal'>
                              Noisy Audio
                            </FormLabel>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name='srtVtt'
                        render={({ field }) => (
                          <FormItem className='flex flex-row items-center justify-between space-x-2'>
                            <FormLabel className='text-sm font-normal'>
                              SRT/VTT
                            </FormLabel>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name='customFormatting'
                        render={({ field }) => (
                          <FormItem className='flex flex-row items-center justify-between space-x-2'>
                            <FormLabel className='text-sm font-normal'>
                              Custom Formatting
                            </FormLabel>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name='recurringOrders'
                        render={({ field }) => (
                          <FormItem className='flex flex-row items-center justify-between space-x-2'>
                            <FormLabel className='text-sm font-normal'>
                              Recurring Orders
                            </FormLabel>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </FormItem>

                <FormField
                  control={form.control}
                  name='additionalInfo'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Information</FormLabel>
                      <FormControl>
                        <div className='relative'>
                          <MessageSquare className='absolute left-3 top-[12px] h-4 w-4 text-muted-foreground' />
                          <Textarea
                            placeholder='Additional Information'
                            className='resize-none pl-9 pt-2'
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button disabled={loading} type='submit' className='w-full mt-7'>
                {loading ? (
                  <>
                    <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                    Please Wait
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className='mr-2 h-4 w-4' />
                    Request Quote
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

export default GetQuote
