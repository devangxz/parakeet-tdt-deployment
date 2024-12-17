'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ReloadIcon } from '@radix-ui/react-icons'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { formSchema } from './controllers'
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

const ResetPassword = () => {
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
  }, [params?.verify_token, session, status, update])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/auth/update-source/${params?.verify_token}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            source: values.source,
          }),
        }
      )
      const responseData = await response.json()
      if (responseData.success) {
        const tId = toast.success(`Successfully saved!`)
        toast.dismiss(tId)
        window.location.href = '/signin'
      } else {
        toast.error(`Failed to save source`)
      }
      setLoading(false)
    } catch (error) {
      toast.error(`Failed to save source`)
    }
  }

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '80vh',
        }}
      >
        <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
        <p>Loading...</p>
      </div>
    )
  }

  if (invalidToken) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          height: '80vh',
        }}
      >
        <div>Token is not valid, pls check your mail.</div>
        <Link
          href={status !== 'authenticated' ? '/signin' : '/files/upload'}
          className='font-bold text-primary'
        >
          {status !== 'authenticated' ? 'Back to Sign in' : 'Back to Dashboard'}
        </Link>
      </div>
    )
  }
  return (
    <>
      <div className='w-full lg:grid lg:min-h-[600px] lg:grid-cols-2 xl:min-h-[800px]'>
        <SideImage />
        <div className='flex items-center justify-center py-12'>
          <div className='mx-auto grid w-[350px] gap-6'>
            <div className='grid gap-2 text-left'>
              <h1 className='text-4xl font-bold'>Thank you</h1>
              <p className='text-muted-foreground'>For verifying your email</p>
            </div>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className='space-y-6'
              >
                <FormField
                  control={form.control}
                  name='source'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>How did you hear about us?</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Select how you find us' />
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {loading ? (
                  <Button disabled className='w-full'>
                    <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                    Submit
                  </Button>
                ) : (
                  <Button type='submit' className='w-full'>
                    Submit
                  </Button>
                )}
              </form>
            </Form>
            <div className='mt-4 text-center text-sm'>
              <Link
                href={status !== 'authenticated' ? '/signin' : '/files/upload'}
                className='font-bold text-primary'
              >
                {status !== 'authenticated'
                  ? 'Back to Sign in'
                  : 'Back to Dashboard'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default ResetPassword
