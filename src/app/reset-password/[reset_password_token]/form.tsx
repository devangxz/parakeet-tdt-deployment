'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ReloadIcon } from '@radix-ui/react-icons'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { formSchema } from './controllers'
import { resetPassword } from '@/app/actions/auth/forgot-password/resetPasswordToken'
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

const ResetPassword = () => {
  const params = useParams()
  const [loading, setLoading] = useState(false)
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: '',
      rememberPassword: false,
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setLoading(true)
      const result = await resetPassword(
        params?.reset_password_token as string,
        values.password
      )

      if (result.success) {
        const tId = toast.success(`Successfully reset password!`)
        toast.dismiss(tId)
        window.location.href = '/signin'
      } else {
        toast.error(result.message || 'Failed to update password')
      }
    } catch (error) {
      toast.error('Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className='w-full lg:grid lg:min-h-[600px] lg:grid-cols-2 xl:min-h-[800px]'>
        <SideImage />
        <div className='flex items-center justify-center py-12'>
          <div className='mx-auto grid w-[350px] gap-6'>
            <div className='grid gap-2 text-left'>
              <h1 className='text-4xl font-bold'>Reset password</h1>
              <p className='text-muted-foreground'>Reset your password here</p>
            </div>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className='space-y-6'
              >
                <FormField
                  control={form.control}
                  name='password'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='Password'
                          type='password'
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='confirmPassword'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='Confirm Password'
                          type='password'
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
                    Reset Password
                  </Button>
                ) : (
                  <Button type='submit' className='w-full'>
                    Reset Password
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

export default ResetPassword
