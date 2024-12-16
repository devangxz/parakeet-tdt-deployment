'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { ReloadIcon } from '@radix-ui/react-icons'
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
    <div className='w-full lg:grid lg:min-h-[600px] lg:grid-cols-2 xl:min-h-[800px]'>
      <SideImage />
      <div className='flex items-center justify-center py-12'>
        <div className='mx-auto grid w-[400px] gap-6'>
          <div className='grid gap-2'>
            <h1 className='text-4xl font-bold'>Got a project for us?</h1>
            <p>Get a customized quote for your transcription project.</p>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Name</FormLabel>
                    <FormControl>
                      <Input placeholder='Your Name' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='userEmail'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder='Email' {...field} />
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
                      <PhoneInput
                        placeholder='Phone Number'
                        {...field}
                        className='space-x-2 not-rounded'
                      />
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
                    <FormLabel>Duration(hours)</FormLabel>
                    <FormControl>
                      <div className='flex items-center gap-2'>
                        <Input
                          type='number'
                          placeholder='Duration in hours'
                          {...field}
                          value={field.value}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value, 10) || 0)
                          }
                          className='w-1/3'
                        />
                        <div className='border-2 text-primary py-1 px-2 rounded-lg font-semibold'>
                          HRS
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='strictVerbatim'
                render={({ field }) => (
                  <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                    <div className='space-y-0.5'>
                      <FormLabel className='text-base'>
                        Strict Verbatim
                      </FormLabel>
                    </div>
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
                  <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                    <div className='space-y-0.5'>
                      <FormLabel className='text-base'>
                        Accented Speakers
                      </FormLabel>
                    </div>
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
                  <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                    <div className='space-y-0.5'>
                      <FormLabel className='text-base'>Noisy Audio</FormLabel>
                    </div>
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
                  <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                    <div className='space-y-0.5'>
                      <FormLabel className='text-base'>SRT/VTT</FormLabel>
                    </div>
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
                  <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                    <div className='space-y-0.5'>
                      <FormLabel className='text-base'>
                        Custom Formatting
                      </FormLabel>
                    </div>
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
                  <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                    <div className='space-y-0.5'>
                      <FormLabel className='text-base'>
                        Recurring Orders
                      </FormLabel>
                    </div>
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
                name='additionalInfo'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Information</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='Additional Information'
                        className='resize-none'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {loading ? (
                <Button disabled className='w-full'>
                  <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                  Request quote
                </Button>
              ) : (
                <Button type='submit' className='w-full'>
                  Request quote
                </Button>
              )}
            </form>
          </Form>
        </div>
      </div>
    </div>
  )
}

export default GetQuote
