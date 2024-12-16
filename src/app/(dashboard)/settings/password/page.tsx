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
    <div className='w-[80%] space-y-[1.25rem]'>
      <div className='w-[70%]'>
        <HeadingDescription heading='Update Password' />
      </div>

      <hr />

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className='space-y-6 w-[70%]'
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
                  <Input placeholder='newpassword' type='password' {...field} />
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

          <div className='my-[1.5rem] flex justify-end'>
            {loading ? (
              <Button disabled>
                <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                Update
              </Button>
            ) : (
              <Button type='submit' className='w-[4rem] h-[2.5rem]'>
                Update
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  )
}

export default Page
