'use client'
import { ReloadIcon } from '@radix-ui/react-icons'
import axios, { AxiosError } from 'axios'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import isValidEmail from '@/utils/isValidEmail'

export default function DisableQC() {
  const [loading, setLoading] = useState(false)
  const [loadingDisable, setLoadingDisable] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    comment: '',
  })

  const handleInputChange = (
    e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>
  ) => {
    const { id, value } = e.target
    setFormData((prevData) => ({ ...prevData, [id]: value }))
  }

  const handleDisableClick = async () => {
    if (!formData.email) {
      toast.error('Please enter an email address.')
      return
    }

    if (!isValidEmail(formData.email)) {
      toast.error('Please enter a valid email address.')
      return
    }

    if (!formData.comment) {
      toast.error('Please enter a comment.')
      return
    }

    try {
      setLoadingDisable(true)
      const response = await axios.post(`/api/admin/disable-qc`, {
        email: formData.email,
        flag: true,
        comment: formData.comment,
      })
      if (response.data.success) {
        toast.success('Editor disabled successfully')
      } else {
        toast.error(response.data.s || 'Failed to disable Editor')
      }
      setLoadingDisable(false)
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        const errorToastId = toast.error(error.response?.data?.s)
        toast.dismiss(errorToastId)
      } else {
        toast.error(`Failed to disabled Editor.`)
      }
      setLoadingDisable(false)
    }
  }

  const handleEnableClick = async () => {
    if (!formData.email) {
      toast.error('Please enter an email address.')
      return
    }

    if (!isValidEmail(formData.email)) {
      toast.error('Please enter a valid email address.')
      return
    }

    try {
      setLoading(true)
      const response = await axios.post(`/api/admin/disable-qc`, {
        email: formData.email,
        flag: false,
        comment: formData.comment,
      })
      if (response.data.success) {
        toast.success('Editor enabled successfully')
      } else {
        toast.error(response.data.s || 'Failed to enable Editor')
      }
      setLoading(false)
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        const errorToastId = toast.error(error.response?.data?.s)
        toast.dismiss(errorToastId)
      } else {
        toast.error(`Failed to enabled Editor.`)
      }
      setLoading(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Disable Editor</CardTitle>
          <CardDescription>
            Please enter the editor email address for disabling.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid gap-6'>
            <div className='grid gap-3'>
              <Label htmlFor='email'>Email Address</Label>
              <Input
                id='email'
                type='email'
                className='w-full'
                placeholder='test@email.com'
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>
            <div className='grid gap-3'>
              <Label htmlFor='comment'>Comment</Label>
              <Textarea
                id='comment'
                className='min-h-32'
                placeholder='Enter your comment here'
                value={formData.comment}
                onChange={handleInputChange}
              />
            </div>
          </div>
          {loadingDisable ? (
            <Button disabled className='mt-5'>
              Please wait
              <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
            </Button>
          ) : (
            <Button
              className='mt-5 mr-3'
              variant='destructive'
              onClick={handleDisableClick}
            >
              Disable
            </Button>
          )}
          {loading ? (
            <Button disabled className='mt-5'>
              Please wait
              <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
            </Button>
          ) : (
            <Button className='mt-5' onClick={handleEnableClick}>
              Enable
            </Button>
          )}
        </CardContent>
      </Card>
    </>
  )
}
