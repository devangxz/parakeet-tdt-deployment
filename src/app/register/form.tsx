'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  Mail,
  User,
  Phone,
  KeyRound,
  Loader2,
  Building2,
  Eye,
  EyeOff,
  UserPlus,
} from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { formSchema } from './controllers'
import { signUp } from '@/app/actions/auth/sign-up'
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

const SignupForm = () => {
  const searchParams = useSearchParams()
  const [captcha, setCaptcha] = useState<boolean>(false)
  const [loading, setLoading] = useState(false)
  const [showOtherIndustryInput, setShowOtherIndustryInput] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      userType: 'customer',
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
        toast.error('Please validate recaptcha.')
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
        newsletter: values.receive_updates ?? false,
      }

      const response = await signUp(userData)

      if (response.success) {
        toast.success('Account created successfully')
        const result = await signIn('credentials', {
          redirect: false,
          email: values.userEmail,
          password: values.password,
        })

        if (result && result.ok) {
          const sessionRes = await fetch('/api/auth/session')
          const session = await sessionRes.json()
          if (session && session.user) {
            const redirectUrl = getRedirectPathByRole(session.user.role)
            window.location.href = redirectUrl
          }
        } else {
          const tId = toast.success(
            'User Created Successfully, please login to your account'
          )
          toast.dismiss(tId)
        }
        form.reset()
      } else {
        toast.error(`Failed to create account: ${response.message}`)
      }
    } catch (error) {
      toast.error(
        `Failed to create user: ${
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred'
        }`
      )
    } finally {
      setLoading(false)
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
                Create Account
              </h1>
              <p className='mt-2 text-md text-gray-700'>
                Fill in your details to create your account
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

                <div className='grid grid-cols-2 gap-4'>
                  <FormField
                    control={form.control}
                    name='userEmail'
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

                  <FormField
                    control={form.control}
                    name='phone'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country & Phone</FormLabel>
                        <FormControl>
                          <div className='relative'>
                            <Phone className='absolute left-[82px] top-[50%] h-4 w-4 text-muted-foreground z-10 pointer-events-none transform -translate-y-1/2' />
                            <PhoneInput
                              placeholder='Enter phone number'
                              {...field}
                              className='flex gap-2 [&>input]:pl-9'
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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
                          className='flex space-x-4'
                        >
                          <FormItem className='flex items-center space-x-2 space-y-0'>
                            <FormControl>
                              <RadioGroupItem value='customer' />
                            </FormControl>
                            <FormLabel className='font-normal'>
                              Customer
                            </FormLabel>
                          </FormItem>
                          <FormItem className='flex items-center space-x-2 space-y-0'>
                            <FormControl>
                              <RadioGroupItem value='transcriber' />
                            </FormControl>
                            <FormLabel className='font-normal'>
                              Transcriber
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch('userType') === 'customer' && (
                  <>
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
                              <div className='relative'>
                                <Building2 className='absolute left-3 top-[12px] h-4 w-4 text-muted-foreground' />
                                <SelectTrigger className='pl-9'>
                                  <SelectValue placeholder='Select Industry' />
                                </SelectTrigger>
                              </div>
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
                              <div className='relative'>
                                <Building2 className='absolute left-3 top-[12px] h-4 w-4 text-muted-foreground' />
                                <Input
                                  className='pl-9'
                                  placeholder='Please specify'
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </>
                )}
              </div>

              <Recaptcha setCaptcha={setCaptcha} />

              <div className='space-y-3'>
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
                    <FormItem className='flex flex-row items-start space-x-3 space-y-0'>
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className='space-y-1 leading-none'>
                        <FormLabel className='text-sm text-gray-700'>
                          Receive updates and discount coupons (once every 3
                          months)
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <Button
                disabled={loading || !captcha}
                type='submit'
                className='w-full mt-7'
              >
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

          <div className='text-center text-sm text-gray-700'>
            Already have an account?{' '}
            <Link href='/signin' className='text-primary hover:underline'>
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignupForm
