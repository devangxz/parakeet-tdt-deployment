'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ReloadIcon } from '@radix-ui/react-icons'
import { UserCheck, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { formSchema } from './controllers'
import { updateSource } from '@/app/actions/auth/update-source'
import { verifyAccount } from '@/app/actions/auth/verify-account'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const VerifyAccount = () => {
  const params = useParams()
  const { status, update, data: session } = useSession()
  const [isLoading, setIsLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [invalidToken, setInvalidToken] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      source: 'Google',
    },
  })

  useEffect(() => {
    const verifyUserAccount = async () => {
      setIsLoading(true)
      try {
        const response = await verifyAccount(params?.verify_token as string)
        if (!response.success) {
          setInvalidToken(true)
        } else {
          if (
            status === 'authenticated' &&
            session?.user?.status !== 'VERIFIED'
          ) {
            await update({
              ...session,
              user: {
                ...session?.user,
                status: 'VERIFIED',
              },
            })
          }
        }
      } catch (err) {
        console.error('Failed to verify account:', err)
      } finally {
        setIsLoading(false)
      }
    }

    verifyUserAccount()
  }, [params?.verify_token])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setLoading(true)
      const response = await updateSource(
        params?.verify_token as string,
        values.source
      )
      if (response.success) {
        const tId = toast.success(`Successfully saved!`)
        toast.dismiss(tId)
        window.location.href = '/signin'
      } else {
        toast.error(`Failed to save source`)
      }
    } catch (error) {
      toast.error(`Failed to save source`)
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className='w-full lg:grid lg:grid-cols-2'>
        <SideImage />
        <div className='flex items-center justify-center px-4 py-12 lg:px-8'>
          <div className='flex items-center space-x-2'>
            <ReloadIcon className='h-4 w-4 animate-spin' />
            <p>Verifying your account...</p>
          </div>
        </div>
      </div>
    )
  }

  if (invalidToken) {
    return (
      <div className='w-full lg:grid lg:grid-cols-2'>
        <SideImage />
        <div className='flex items-center justify-center px-4 py-12 lg:px-8'>
          <div className='w-full max-w-sm text-center'>
            <div className='space-y-2.5 mb-6'>
              <h1 className='text-4xl font-semibold tracking-tight'>
                Invalid Token
              </h1>
              <p className='mt-2 text-md text-muted-foreground'>
                The verification link appears to be invalid. Please check your
                email for the correct link.
              </p>
            </div>
            <div className='text-center text-sm'>
              <Link
                href={status !== 'authenticated' ? '/signin' : '/files/upload'}
                className='text-primary hover:underline'
              >
                {status !== 'authenticated'
                  ? 'Back to Sign In'
                  : 'Back to Dashboard'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='w-full lg:grid lg:grid-cols-2'>
      <SideImage />
      <div className='flex items-center justify-center px-4 py-12 lg:px-8'>
        <div className='w-full max-w-sm space-y-5'>
          <div className='space-y-2.5 mb-6 text-center lg:text-left'>
            <div>
              <h1 className='text-4xl font-semibold tracking-tight'>
                Thank you
              </h1>
              <p className='mt-2 text-md text-muted-foreground'>
                Your email has been successfully verified
              </p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-7'>
              <FormField
                control={form.control}
                name='source'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>How did you hear about us?</FormLabel>
                    <FormControl>
                      <div className='relative'>
                        <UserCheck className='absolute left-3 top-[12px] h-4 w-4 text-muted-foreground z-10' />
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className='pl-9'>
                              <SelectValue placeholder='Select how you found us' />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value='Google'>Google</SelectItem>
                            <SelectItem value='Bing'>Bing</SelectItem>
                            <SelectItem value='Facebook'>Facebook</SelectItem>
                            <SelectItem value='Twitter'>Twitter</SelectItem>
                            <SelectItem value='A friend'>A friend</SelectItem>
                            <SelectItem value='Other'>Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button disabled={loading} type='submit' className='w-full mt-7'>
                {loading ? (
                  <>
                    <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                    Please Wait
                  </>
                ) : (
                  <>
                    <CheckCircle className='mr-2 h-4 w-4' />
                    Submit
                  </>
                )}
              </Button>
            </form>
          </Form>

          <div className='text-center text-sm'>
            <Link
              href={status !== 'authenticated' ? '/signin' : '/files/upload'}
              className='text-primary hover:underline'
            >
              {status !== 'authenticated'
                ? 'Back to Sign In'
                : 'Back to Dashboard'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VerifyAccount
