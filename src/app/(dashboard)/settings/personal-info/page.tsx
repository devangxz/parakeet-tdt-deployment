'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { ReloadIcon } from '@radix-ui/react-icons'
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { formEmailSchema, formSchema } from './controllers'
import countries from '../../../../../countries.json'
import {
  updatePersonalInfo,
  getPersonalInfo,
} from '@/app/actions/user/personal-info'
import { updateSecondaryEmail } from '@/app/actions/user/secondary-email'
import HeadingDescription from '@/components/heading-description'
import { PhoneInput } from '@/components/phone-input/phone-input'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { mapKeyToMessage } from '@/utils/error-util'

const Page = () => {
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [loadingEmail, setLoadingEmail] = useState(false)
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      country: '',
      city: '',
      add1: '',
      add2: '',
      postalCode: '',
      industry: '',
      otherIndustry: '',
    },
  })

  const emailForm = useForm<z.infer<typeof formEmailSchema>>({
    resolver: zodResolver(formEmailSchema),
    defaultValues: {
      secondaryEmail: '',
      defaultEmail: false,
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoadingOptions(true)
    try {
      const response = await updatePersonalInfo({
        ...values,
        country: values.country || undefined,
        state: values.state || undefined,
        city: values.city || undefined,
        add1: values.add1 || undefined,
        add2: values.add2 || undefined,
        postalCode: values.postalCode || undefined,
        industry: values.industry || undefined,
      })
      if (response.success) {
        const message = mapKeyToMessage(response.message)
        const successToastId = toast.success(message)
        toast.dismiss(successToastId)
      } else {
        const message = mapKeyToMessage(response.message)
        const errorToastId = toast.error(message)
        toast.dismiss(errorToastId)
      }
    } catch (error) {
      toast.error(`Error: ${error}`)
    } finally {
      setLoadingOptions(false)
    }
  }

  async function onEmailSubmit(
    e: React.FormEvent,
    values: z.infer<typeof formEmailSchema>
  ) {
    e.preventDefault()
    setLoadingEmail(true)
    try {
      const response = await updateSecondaryEmail(values)
      if (response.success) {
        const message = mapKeyToMessage(response.message)
        const successToastId = toast.success(message)
        toast.dismiss(successToastId)
      } else {
        const message = mapKeyToMessage(response.message)
        const errorToastId = toast.error(message)
        toast.dismiss(errorToastId)
      }
    } catch (error) {
      toast.error(`Error: ${error}`)
    } finally {
      setLoadingEmail(false)
    }
  }

  useEffect(() => {
    const fetchPersonalInfo = async () => {
      try {
        const response = await getPersonalInfo()
        if (response.success && response.data) {
          const payload = response.data.info
          const data = {
            firstName: payload?.firstname ?? '',
            lastName: payload?.lastname ?? '',
            phone: payload?.phoneNumber ?? '',
            country: payload?.country ?? '',
            state: payload?.state ?? '',
            city: payload?.city ?? '',
            postalCode: payload?.postalCode ?? '',
            add1: payload?.address1 ?? '',
            add2: payload?.address2 ?? '',
            industry: payload?.industry ?? '',
          }
          for (const [key, value] of Object.entries(data)) {
            form.setValue(key as keyof z.infer<typeof formSchema>, value)
          }

          const secondaryEmail =
            response.data.secondaryEmail?.secondaryEmail ?? ''
          for (const [key, value] of Object.entries({
            secondaryEmail: secondaryEmail,
          })) {
            emailForm.setValue(
              key as keyof z.infer<typeof formEmailSchema>,
              value
            )
          }
        } else {
          toast.error(`Error fetching personal info`)
        }
      } catch (error) {
        toast.error(`Error fetching personal info ${error}`)
      }
    }

    fetchPersonalInfo()
  }, [])

  return (
    <div className='w-[80%] space-y-[1.25rem]'>
      <HeadingDescription heading='Personal Info' />
      <div className='w-[70%]'>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-[1rem]'
          >
            <div className='flex w-[100%] gap-[1.8rem]'>
              <FormField
                control={form.control}
                name='firstName'
                render={({ field }) => (
                  <FormItem className='w-[50%]'>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder='Your First Name' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='lastName'
                render={({ field }) => (
                  <FormItem className='w-[50%]'>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder='Your Last Name' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name='phone'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
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
              name='country'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value)
                    }}
                    value={field.value || ''}
                    autoComplete='true'
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select an option' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent autoFocus>
                      {countries.map((item, index) => (
                        <SelectItem key={index} value={`${item?.code}`}>
                          {item?.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='state'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Your State'
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='city'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Your City'
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='add1'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address1</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Enter your address'
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='add2'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address2</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Enter your address'
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='postalCode'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Postal code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Enter postal code'
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className='flex justify-end'>
              <SaveButton type='submit' loading={loadingOptions} />
            </div>
          </form>
        </Form>
      </div>

      <hr />

      <div className='w-[70%]'>
        <Form {...emailForm}>
          <form onSubmit={(e) => onEmailSubmit(e, emailForm.getValues())}>
            <FormField
              control={emailForm.control}
              name='secondaryEmail'
              render={({ field }) => (
                <FormItem>
                  <HeadingDescription
                    heading={'Email'}
                    description={
                      'The secondary email address can be set as the Sign In email address after it has been verified. Use this setting if you wish to change the login email address of your Scribie.com account.'
                    }
                  />
                  <FormControl>
                    <Input placeholder='Email' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className='flex items-center justify-between'>
              <FormField
                control={emailForm.control}
                name='defaultEmail'
                render={({ field }) => (
                  <FormItem className='flex flex-row items-start space-x-3 space-y-0'>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className='text-black text-xs not-italic font-normal leading-4'>
                      <FormLabel>Set as Sign In Email</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              <SaveButton type='submit' loading={loadingEmail} />
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}

export default Page

interface SaveButtonProps {
  type: 'submit' | 'reset' | 'button'
  loading: boolean
}

function SaveButton(props: SaveButtonProps) {
  const { type, loading = false } = props
  return (
    <div className='my-[1.5rem]'>
      {loading ? (
        <Button type={type} disabled>
          <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
          Update
        </Button>
      ) : (
        <Button type={type} className='w-[4rem] h-[2.5rem]'>
          Update
        </Button>
      )}
    </div>
  )
}
