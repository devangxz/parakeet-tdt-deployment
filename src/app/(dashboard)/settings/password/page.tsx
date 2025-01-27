'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ReloadIcon } from '@radix-ui/react-icons'
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { formSchema } from './controllers'
import { updatePassword } from '@/app/actions/user/update-password'
import HeadingDescription from '@/components/heading-description'
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
import { mapKeyToMessage } from '@/utils/error-util'

const Page = () => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: '',
      newpassword: '',
      confirmPassword: '',
    },
  })
  const [loading, setLoading] = useState(false)

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true)
    try {
      const response = await updatePassword({
        password: values.password,
        newPassword: values.newpassword,
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
      const errorToastId = toast.error(`Error updating password: ${error}`)
      toast.dismiss(errorToastId)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='lg:w-[70%] flex flex-1 flex-col p-4'>
      <div className='space-y-4'>
        <HeadingDescription heading='Update Password' />

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-2.5'
            autoComplete='off'
          >
            <FormField
              control={form.control}
              name='password'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Password</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete='off'
                      placeholder='Password'
                      type='password'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='newpassword'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='newpassword'
                      type='password'
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
                      placeholder='Confirm Password'
                      type='password'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='flex justify-end pt-2'>
              <div>
                {loading ? (
                  <Button
                    type='submit'
                    disabled
                    variant='default'
                    className='w-full'
                  >
                    <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                    Update
                  </Button>
                ) : (
                  <Button type='submit' variant='default' className='w-full'>
                    Update
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}

export default Page
