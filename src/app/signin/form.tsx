'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ReloadIcon } from '@radix-ui/react-icons'
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { CAPTCHA_EXCEPTION_LIST } from '@/constants'
import { getRedirectPathByRole } from '@/utils/roleRedirect'

const Signin = () => {
  const [captcha, setCaptcha] = useState<boolean>(true)
  const [loading, setLoading] = useState(false)
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
    <>
      <div className='w-full lg:grid lg:min-h-[600px] lg:grid-cols-2 xl:min-h-[800px]'>
        <SideImage />
        <div className='flex items-center justify-center py-12'>
          <div className='mx-auto grid w-[350px] gap-6'>
            <div className='grid gap-2 text-left'>
              <h1 className='text-4xl font-bold'>Welcome back</h1>
              <p className='text-balance text-muted-foreground'>
                Login to manage your account.
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
                        <Input
                          data-testid='user-email'
                          placeholder='Email'
                          {...field}
                        />
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
                        <Input
                          data-testid='user-password'
                          placeholder='Password'
                          type='password'
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        <Link href='/forgot-password' className='underline'>
                          Forgot Password?
                        </Link>
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='rememberPassword'
                  render={({ field }) => (
                    <FormItem className='flex flex-row items-start space-x-3 space-y-0'>
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div
                        data-testid='remember-password'
                        className='space-y-1 leading-none'
                      >
                        <FormLabel>Remember Password?</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <Recaptcha setCaptcha={setCaptcha} />
                {loading ? (
                  <Button disabled className='w-full'>
                    <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                    Please wait
                  </Button>
                ) : (
                  <Button
                    disabled={
                      !CAPTCHA_EXCEPTION_LIST.includes(
                        form.getValues('email')
                      ) && !captcha
                    }
                    type='submit'
                    className='w-full'
                  >
                    Login
                  </Button>
                )}
              </form>
            </Form>
            <div className='mt-4 text-center text-sm'>
              Don&apos;t have an account?{' '}
              <Link
                href='/register'
                data-testid='sing-in-button'
                className='underline'
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Signin
