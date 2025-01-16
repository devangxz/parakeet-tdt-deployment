'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, Loader2, LinkIcon } from 'lucide-react'
import Link from 'next/link'
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { formSchema } from './controllers'
import { forgotPassword } from '@/app/actions/auth/forgot-password'
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
      const response = await forgotPassword(values.email)

      if (response.success) {
        const tId = toast.success(
          `The email to reset the password is successfully sent to your registered email-Id`
        )
        toast.dismiss(tId)
      } else {
        toast.error(
          response.message || 'Failed to send forgot password instructions'
        )
      }
    } catch (error) {
      toast.error('Failed to send forgot password instructions')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='w-full lg:grid lg:grid-cols-2'>
      <SideImage />
      <div className='flex items-center justify-center px-4 py-12 lg:px-8'>
        <div className='w-full max-w-sm space-y-5'>
          <div className='space-y-2.5 mb-6 text-center lg:text-left'>
            <div>
              <h1 className='text-4xl font-semibold tracking-tight'>
                Get Reset Link
              </h1>
              <p className='mt-2 text-md text-gray-700'>
                Enter your email address below and we&apos;ll get you back on
                track
              </p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
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

              <Button disabled={loading} type='submit' className='w-full mt-7'>
                {loading ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Please Wait
                  </>
                ) : (
                  <>
                    <LinkIcon className='mr-2 h-4 w-4' />
                    Request Reset Link
                  </>
                )}
              </Button>
            </form>
          </Form>

          <div className='text-center text-sm text-gray-700'>
            Remember your password?{' '}
            <Link href='/signin' className='text-primary hover:underline'>
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
