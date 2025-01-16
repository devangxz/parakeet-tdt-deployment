'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, KeyRound, Loader2, Eye, EyeOff, LogIn } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { formSchema } from './controllers'
import Recaptcha from '@/components/recaptcha'
import SideImage from '@/components/side-image'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { CAPTCHA_EXCEPTION_LIST } from '@/constants'
import { getRedirectPathByRole } from '@/utils/roleRedirect'

const Signin = () => {
  const [captcha, setCaptcha] = useState<boolean>(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const searchParams = useSearchParams()
  const callbackUrl = searchParams?.get('callbackUrl')

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberPassword: false,
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!CAPTCHA_EXCEPTION_LIST.includes(values.email)) {
      if (!captcha) {
        toast.error(`Please validate recaptcha.`)
        return
      }
    }
    setLoading(true)
    const result = await signIn('credentials', {
      redirect: false,
      email: values.email,
      password: values.password,
    })

    if (result && result.ok) {
      const response = await fetch('/api/auth/session')
      const session = await response.json()
      if (session && session.user) {
        if (session.user.status === 'VERIFIED') {
          const redirectUrl =
            callbackUrl || getRedirectPathByRole(session.user.role)
          window.location.href = redirectUrl
        } else {
          window.location.href = '/verify-email'
        }
      }
    } else {
      setLoading(false)
      toast.error(`Failed to sign user in.`)
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
                Welcome Back
              </h1>
              <p className='mt-2 text-md text-gray-700'>
                Enter your credentials to access your account
              </p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className='space-y-4'>
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
                            data-testid='user-email'
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
                  name='password'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className='relative'>
                          <KeyRound className='absolute left-3 top-[12px] h-4 w-4 text-muted-foreground' />
                          <Input
                            data-testid='user-password'
                            type={showPassword ? 'text' : 'password'}
                            className='pl-9'
                            placeholder='Enter password'
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

                <div className='flex items-center justify-between'>
                  <FormField
                    control={form.control}
                    name='rememberPassword'
                    render={({ field }) => (
                      <FormItem className='flex flex-row items-start space-x-2 space-y-0'>
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className='mt-0.5'
                          />
                        </FormControl>
                        <div className='leading-none'>
                          <FormLabel className='text-sm font-normal'>
                            Remember Me
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  <Link
                    href='/forgot-password'
                    className='text-sm text-primary hover:underline'
                  >
                    Forgot Password?
                  </Link>
                </div>
              </div>

              <Recaptcha setCaptcha={setCaptcha} />

              <Button
                disabled={
                  loading ||
                  (!CAPTCHA_EXCEPTION_LIST.includes(form.getValues('email')) &&
                    !captcha)
                }
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
                    <LogIn className='mr-2 h-4 w-4' />
                    Sign In
                  </>
                )}
              </Button>
            </form>
          </Form>

          <div className='text-center text-sm text-gray-700'>
            Don&apos;t have an account?{' '}
            <Link
              href='/register'
              data-testid='sing-in-button'
              className='text-primary hover:underline'
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Signin
