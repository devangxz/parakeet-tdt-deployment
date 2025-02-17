'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  Mail,
  User,
  KeyRound,
  Loader2,
  Eye,
  EyeOff,
  UserPlus,
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { formSchema } from './controllers'
import { createUser } from '@/app/actions/user/create'
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

const JoinTeamForm = ({ initialEmail }: { initialEmail: string }) => {
  const params = useParams()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: initialEmail,
      password: '',
      confirmPassword: '',
      terms: false,
      receive_updates: false,
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setLoading(true)

      const response = await createUser({
        email: values.email,
        pass: values.password,
        fn: values.firstName,
        ln: values.lastName,
        inviteKey: params?.invite_key as string,
      })

      if (response.success) {
        const result = await signIn('credentials', {
          redirect: false,
          email: values.email,
          password: values.password,
        })

        if (result && result.ok) {
          const response = await fetch('/api/auth/session')
          const session = await response.json()
          if (session && session.user) {
            window.location.href = '/files/shared'
          }
        } else {
          setLoading(false)
          const tId = toast.success(
            `Successfully created account, please login to continue`
          )
          toast.dismiss(tId)
        }
      } else {
        setLoading(false)
        toast.error(`Failed to create account: ${response.message}`)
      }
    } catch (error) {
      setLoading(false)
      toast.error(`Failed to create account: ${error}`)
    }
  }

  return (
    <div className='w-full lg:grid lg:grid-cols-2'>
      <SideImage />
      <div className='flex items-center justify-center px-4 py-12 lg:px-8'>
        <div className='w-full max-w-[600px] space-y-5'>
          <div className='space-y-2.5 mb-6 text-center lg:text-left'>
            <div>
              <h1 className='text-4xl font-semibold tracking-tight'>
                Welcome to Scribie
              </h1>
              <p className='mt-2 text-md text-muted-foreground'>
                Please fill out the form to create your account
              </p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className='space-y-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <FormField
                    control={form.control}
                    name='firstName'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <div className='relative'>
                            <User className='absolute left-3 top-[12px] h-4 w-4 text-muted-foreground' />
                            <Input
                              className='pl-9'
                              placeholder='Enter first name'
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
                    name='lastName'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <div className='relative'>
                            <User className='absolute left-3 top-[12px] h-4 w-4 text-muted-foreground' />
                            <Input
                              className='pl-9'
                              placeholder='Enter last name'
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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
                            readOnly
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className='grid grid-cols-2 gap-4'>
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
                              placeholder='Confirm password'
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
              </div>

              <div className='space-y-3 mt-7'>
                <FormField
                  control={form.control}
                  name='terms'
                  render={({ field }) => (
                    <FormItem className='flex flex-row items-center space-x-3 space-y-0'>
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className='space-y-1 leading-none'>
                        <FormLabel className='text-sm text-muted-foreground'>
                          I agree to the{' '}
                          <Link
                            href='/terms'
                            className='text-primary hover:underline'
                          >
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
                    <FormItem className='flex flex-row items-center space-x-3 space-y-0'>
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className='space-y-1 leading-none'>
                        <FormLabel className='text-sm text-muted-foreground'>
                          Receive updates and discount coupons (once every 3
                          months)
                        </FormLabel>
                      </div>
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
                    <UserPlus className='mr-2 h-4 w-4' />
                    Create an Account with Scribie
                  </>
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  )
}

export default JoinTeamForm
