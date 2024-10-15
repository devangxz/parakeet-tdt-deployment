/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { ReloadIcon } from '@radix-ui/react-icons'
import { format } from 'date-fns'
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { formSchema } from './controllers'
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
      const response = await fetch(`/api/static-mails/demo-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          UserEmail: values.userEmail,
          Duration: values.duration,
          Name: values.name,
          Onetimeorder: values.onetimeorder ? '1' : '0',
          Phone: values.phone,
          DemoDate: values.demoDate.toLocaleString(),
        }),
      })
      await response.json()
      setLoading(false)
      toast.success('Demo Request Submitted Successfully!')
    } catch (error) {
      setLoading(false)
      toast.error(`Failed to Submit Demo Request: ${error}`)
    }
  }
  return (
    <div className='w-full lg:grid lg:min-h-[600px] lg:grid-cols-2 xl:min-h-[800px]'>
      <SideImage />
      <div className='flex items-center justify-center py-12'>
        <div className='mx-auto grid w-[350px] gap-6'>
          <div className='grid gap-2'>
            <h1 className='text-4xl font-bold'>Schedule a Demo!</h1>
            <p>Learn how Scribie can help you.</p>
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
                name='demoDate'
                render={({ field }) => (
                  <FormItem className='flex flex-col'>
                    <FormLabel>
                      What is your preferred date and time for the demo?
                    </FormLabel>
                    <Input
                      type='datetime-local'
                      {...field}
                      value={format(field.value, "yyyy-MM-dd'T'HH:mm")}
                      onChange={(e) => field.onChange(new Date(e.target.value))}
                      placeholder='Select Date and Time'
                      className='w-fit'
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='duration'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration(Minutes)</FormLabel>
                    <FormControl>
                      <div className='flex items-center gap-2'>
                        <Input
                          type='number'
                          placeholder='Duration in minutes'
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
                name='onetimeorder'
                render={({ field }) => (
                  <FormItem className='space-y-3'>
                    <FormLabel>Is this a one time project?</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value ? 'yes' : 'no'}
                        className='flex space-x-2'
                      >
                        <FormItem className='flex items-center space-x-1 space-y-0'>
                          <FormControl>
                            <RadioGroupItem value='yes' />
                          </FormControl>
                          <FormLabel className='font-normal'>Yes</FormLabel>
                        </FormItem>
                        <FormItem className='flex items-center space-x-1 space-y-0'>
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
              <Recaptcha setCaptcha={setCaptcha} />
              {loading ? (
                <Button disabled className='w-full'>
                  <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                  Create an account with Scribie
                </Button>
              ) : (
                <Button disabled={!captcha} type='submit' className='w-full'>
                  Create an account with Scribie
                </Button>
              )}
            </form>
          </Form>
        </div>
      </div>
    </div>
  )
}

export default GetDemo
