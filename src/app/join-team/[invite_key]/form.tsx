/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { ReloadIcon } from '@radix-ui/react-icons'
import axios from 'axios'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { formSchema } from './controllers'
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
import { getRedirectPathByRole } from '@/utils/roleRedirect'

const JoinTeamForm = () => {
  const params = useParams()
  const [isLoading, setIsLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [ownerDetails, setOwnerDetails] = useState({
    name: '',
    email: '',
    userEmail: '',
  })
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      terms: false,
      receive_updates: false,
    },
  })

  useEffect(() => {
    const fetchTeamInformation = async () => {
      setIsLoading(true)
      try {
        const response = await axios.get(
          `/api/team/member/join?inviteKey=${params?.invite_key}`
        )

        setOwnerDetails({
          name: response.data.details.ownerFirstname,
          email: response.data.details.ownerEmail,
          userEmail: response.data.details.email,
        })
        form.reset({
          ...form.getValues(),
          email: response.data.details.email,
        })
      } catch (err) {
        console.error('Failed to fetch team details:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTeamInformation()
  }, [params?.invite_key])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setLoading(true)
      const response = await fetch(`/api/team/member/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: values.email,
          pass: values.password,
          fn: values.firstName,
          ln: values.lastName,
        }),
      })
      const responseData = await response.json()
      if (responseData.success) {
        const result = await signIn('credentials', {
          redirect: false,
          email: values.email,
          password: values.password,
        })

        if (result && result.ok) {
          const response = await fetch('/api/auth/session')
          const session = await response.json()
          if (session && session.user) {
            const redirectUrl = getRedirectPathByRole(session.user.role)
            window.location.href = redirectUrl
          }
        } else {
          setLoading(false)
          const tId = toast.success(
            `Successfully joined team, pls login to continue`
          )
          toast.dismiss(tId)
        }
      } else {
        setLoading(false)
        toast.error(`Failed to join team: ${responseData.message}`)
      }
    } catch (error) {
      setLoading(false)
      toast.error(`Failed to join team: ${error}`)
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

  return (
    <div className='w-full lg:grid lg:min-h-[600px] lg:grid-cols-2 xl:min-h-[800px]'>
      <SideImage />
      <div className='flex items-center justify-center py-12'>
        <div className='mx-auto grid w-[350px] gap-6'>
          <div className='grid gap-2'>
            <h1 className='text-4xl font-bold'>Welcome to Scribie</h1>
            <p>
              Please fill out the form to create your account and join{' '}
              {ownerDetails.name} ({ownerDetails.email})&rsquo;s team
            </p>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-3'>
              <FormField
                control={form.control}
                name='firstName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder='First Name' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='lastName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder='Last Name' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='email'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder='Email' {...field} readOnly />
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
                        type='password'
                        placeholder='Password'
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
                        type='password'
                        placeholder='Confirm Password'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='terms'
                render={({ field }) => (
                  <FormItem className='flex flex-row items-start space-x-3 space-y-0'>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className='space-y-1 leading-none'>
                      <FormLabel>
                        I agree to the{' '}
                        <Link href='#' className='underline'>
                          terms & conditions
                        </Link>
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='receive_updates'
                render={({ field }) => (
                  <FormItem className='flex flex-row items-start space-x-3 space-y-0'>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className='space-y-1 leading-none'>
                      <FormLabel>
                        Receive updates and discount coupons (once every 3
                        months)
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              {loading ? (
                <Button disabled className='w-full'>
                  <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                  Join Team
                </Button>
              ) : (
                <Button type='submit' className='w-full'>
                  Join Team
                </Button>
              )}
            </form>
          </Form>
        </div>
      </div>
    </div>
  )
}

export default JoinTeamForm
