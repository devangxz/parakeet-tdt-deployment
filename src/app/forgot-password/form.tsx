'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ReloadIcon } from '@radix-ui/react-icons'
import Link from 'next/link'
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { formSchema } from './controllers'
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

const ForgotPassword = () => {
  const [loading, setLoading] = useState(false)
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setLoading(true)
      const response = await fetch(`/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: values.email,
        }),
      })
      const responseData = await response.json()
      if (responseData.success) {
        const tId = toast.success(
          `The email to reset the password is successfully sent to your registered email-Id`
        )
        toast.dismiss(tId)
      } else {
        toast.error(`Failed to send forgot password instructions`)
      }
      setLoading(false)
    } catch (error) {
      toast.error(`Failed to send forgot password instructions`)
    }
  }
  return (
    <>
      <div className='w-full lg:grid lg:min-h-[600px] lg:grid-cols-2 xl:min-h-[800px]'>
        <SideImage />
        <div className='flex items-center justify-center py-12'>
          <div className='mx-auto grid w-[350px] gap-6'>
            <div className='grid gap-2 text-left'>
              <h1 className='text-4xl font-bold'>Forgot password?</h1>
              <p className='text-muted-foreground'>
                Enter your email address below and we&apos;ll get you back on
                track
              </p>
            </div>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className='space-y-6'
              >
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
                {loading ? (
                  <Button disabled className='w-full'>
                    <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                    Request Reset Link
                  </Button>
                ) : (
                  <Button type='submit' className='w-full'>
                    Request Reset Link
                  </Button>
                )}
              </form>
            </Form>
            <div className='mt-4 text-center text-sm'>
              <Link href='/signin' className='font-bold text-primary'>
                Back to Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default ForgotPassword
