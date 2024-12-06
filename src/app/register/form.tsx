'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { ReloadIcon } from '@radix-ui/react-icons'
import axios from 'axios'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { formSchema } from './controllers'
import { PhoneInput } from '@/components/phone-input/phone-input'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { INDUSTRIES } from '@/constants'
import { getRedirectPathByRole } from '@/utils/roleRedirect'

const SingupForm = () => {
  const searchParams = useSearchParams()
  const [captcha, setCaptcha] = useState<boolean>(false)
  const [loading, setLoading] = useState(false)
  const [showOtherIndustryInput, setShowOtherIndustryInput] = useState(false)
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      userType: '',
      phone: '',
      industry: '',
      otherIndustry: '',
      userEmail: '',
      password: '',
      confirmPassword: '',
      terms: false,
      receive_updates: false,
    },
  })
  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (!captcha) {
        toast.error(`Please validate recaptcha.`)
        return
      }
      const referralCode = searchParams?.get('rc') || ''
      setLoading(true)
      const userData = {
        email: values.userEmail,
        password: values.password,
        firstname: values.firstName,
        lastname: values.lastName,
        role: values.userType,
        phone: values.phone,
        rc: referralCode,
        industry:
          values.otherIndustry !== ''
            ? values.otherIndustry
            : values.industry || '',
        newsletter: values.receive_updates,
      }

      const response = await axios.post('/api/auth/sign-up', userData)

      if (response.status === 201) {
        toast.success('Account created successfully')
        const result = await signIn('credentials', {
          redirect: false,
          email: values.userEmail,
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
          const tId = toast.success(
            `User Created Sucessfully, please login to your account`
          )
          toast.dismiss(tId)
        }
        form.reset()
      } else {
        toast.error(`Failed to create account: ${response.data.message}`)
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          `Failed to create user: ${
            error.response?.data.message || error.message
          }`
        )
      } else {
        toast.error(`Failed to create user: An unexpected error occurred`)
      }
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className='w-full lg:grid lg:min-h-[600px] lg:grid-cols-2 xl:min-h-[800px]'>
      <SideImage />
      <div className='flex items-center justify-center py-12'>
        <div className='mx-auto grid w-[350px] gap-6'>
          <div className='grid gap-2'>
            <h1 className='text-4xl font-bold'>Create Account</h1>
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
                name='userEmail'
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
              <FormField
                control={form.control}
                name='phone'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country & Phone</FormLabel>
                    <FormControl>
                      <PhoneInput
                        placeholder='Phone Number'
                        {...field}
                        className='space-x-2 not-rounded'
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
                name='userType'
                render={({ field }) => (
                  <FormItem className='space-y-3'>
                    <FormLabel>User Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className='flex space-x-2'
                      >
                        <FormItem className='flex items-center space-x-1 space-y-0'>
                          <FormControl>
                            <RadioGroupItem value='customer' />
                          </FormControl>
                          <FormLabel className='font-normal'>
                            Customer
                          </FormLabel>
                        </FormItem>
                        <FormItem className='flex items-center space-x-1 space-y-0'>
                          <FormControl>
                            <RadioGroupItem value='transcriber' />
                          </FormControl>
                          <FormLabel className='font-normal'>
                            Transciber
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='industry'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Industry</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        setShowOtherIndustryInput(value === 'Other')
                        field.onChange(value)
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select an Industry Type' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {INDUSTRIES.map((industry) => (
                          <SelectItem key={industry} value={industry}>
                            {industry}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {showOtherIndustryInput && (
                <FormField
                  control={form.control}
                  name='otherIndustry'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Other Industry</FormLabel>
                      <FormControl>
                        <Input placeholder='Please specify' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <Recaptcha setCaptcha={setCaptcha} />
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
                        <Link href='/terms' className='underline'>
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
                  Create an account with Scribie
                </Button>
              ) : (
                <Button disabled={!captcha} type='submit' className='w-full'>
                  Create an account with Scribie
                </Button>
              )}
            </form>
          </Form>
        </div>
      </div>
    </div>
  )
}

export default SingupForm
