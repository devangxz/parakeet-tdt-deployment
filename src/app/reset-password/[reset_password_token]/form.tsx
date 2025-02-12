'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, Loader2, Eye, EyeOff, Lock } from 'lucide-react'
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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

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
    <div className='w-full lg:grid lg:grid-cols-2'>
      <SideImage />
      <div className='flex items-center justify-center px-4 py-12 lg:px-8'>
        <div className='w-full max-w-sm space-y-5'>
          <div className='space-y-2.5 mb-6 text-center lg:text-left'>
            <div>
              <h1 className='text-4xl font-semibold tracking-tight'>
                Reset password
              </h1>
              <p className='mt-2 text-md text-muted-foreground'>
                Enter your new password below
              </p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className='space-y-4'>
                <FormField
                  control={form.control}
                  name='password'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <div className='relative'>
                          <KeyRound className='absolute left-3 top-[12px] h-4 w-4 text-muted-foreground' />
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            className='pl-9'
                            placeholder='Enter new password'
                            {...field}
                          />
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className='h-4 w-4 text-muted-foreground' />
                            ) : (
                              <Eye className='h-4 w-4 text-muted-foreground' />
                            )}
                          </Button>
                        </div>
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
                        <div className='relative'>
                          <KeyRound className='absolute left-3 top-[12px] h-4 w-4 text-muted-foreground' />
                          <Input
                            type={showConfirmPassword ? 'text' : 'password'}
                            className='pl-9'
                            placeholder='Confirm new password'
                            {...field}
                          />
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
                            onClick={() =>
                              setShowConfirmPassword(!showConfirmPassword)
                            }
                          >
                            {showConfirmPassword ? (
                              <EyeOff className='h-4 w-4 text-muted-foreground' />
                            ) : (
                              <Eye className='h-4 w-4 text-muted-foreground' />
                            )}
                          </Button>
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
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Please Wait
                  </>
                ) : (
                  <>
                    <Lock className='mr-2 h-4 w-4' />
                    Reset Password
                  </>
                )}
              </Button>
            </form>
          </Form>

          <div className='text-center text-sm text-muted-foreground'>
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

export default ResetPassword
