'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import {
  getOrderComments,
  updateOrderComments,
} from '@/app/actions/order/comments'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'

const FormSchema = z.object({
  comments: z.string(),
})

export function SpecialInstructions({
  fileId,
  setToggleCheckAndDownload,
}: {
  fileId: string
  setToggleCheckAndDownload: (value: boolean) => void
}) {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  })

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    const toastId = toast.loading(`Submitting.`)
    const { comments } = data
    try {
      await updateOrderComments(fileId, comments)
      toast.dismiss(toastId)
      const successToastId = toast.success(`Submitted Successfully`)
      toast.dismiss(successToastId)
      setToggleCheckAndDownload(false)
    } catch (err) {
      const errorToastId = toast.error(`Error` + err)
      toast.dismiss(errorToastId)
      toast.dismiss(toastId)
      console.log(err)
    }
  }

  useEffect(() => {
    const loadComments = async () => {
      const comments = await getOrderComments(fileId)
      form.setValue('comments', comments?.comments ?? '')
    }
    loadComments()
  }, [fileId, form])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='w-2/3 space-y-6'>
        <FormField
          control={form.control}
          name='comments'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Comments</FormLabel>
              <FormControl>
                <Textarea
                  placeholder='Enter Here'
                  className='resize-none'
                  {...field}
                  rows={5}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type='submit'>Submit</Button>
      </form>
    </Form>
  )
}
