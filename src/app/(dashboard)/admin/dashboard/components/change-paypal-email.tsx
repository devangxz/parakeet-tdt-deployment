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
import isValidEmail from '@/utils/isValidEmail'

export default function ChangePaypalEmail() {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    transcriber_email: '',
    paypal_email: '',
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData((prevData) => ({ ...prevData, [id]: value }))
  }

  const handleChangeClick = async () => {
    if (!formData.transcriber_email) {
      toast.error('Please enter an transcriber email address.')
      return
    }

    if (!isValidEmail(formData.transcriber_email)) {
      toast.error('Please enter a valid transcriber email address.')
      return
    }

    if (!formData.paypal_email) {
      toast.error('Please enter an paypal email address.')
      return
    }

    if (!isValidEmail(formData.paypal_email)) {
      toast.error('Please enter a valid paypal email address.')
      return
    }

    try {
      setLoading(true)
      const response = await axios.post(`/api/admin/change-paypal-email`, {
        email: formData.transcriber_email,
        newEmail: formData.paypal_email,
      })
      if (response.data.success) {
        toast.success('Successfully changed paypal email.')
      } else {
        toast.error(response.data.s || 'Failed to change paypal email')
      }
      setLoading(false)
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        const errorToastId = toast.error(error.response?.data?.s)
        toast.dismiss(errorToastId)
      } else {
        toast.error(`Failed to change paypal email`)
      }
      setLoading(false)
    }
  }
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Change Paypal Email</CardTitle>
          <CardDescription>
            Please enter the transcriber and new paypal email address for
            changing the paypal email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid gap-6'>
            <div className='grid gap-3'>
              <Label htmlFor='transcriber_email'>Transcriber Email</Label>
              <Input
                id='transcriber_email'
                type='email'
                className='w-full'
                placeholder='test@email.com'
                value={formData.transcriber_email}
                onChange={handleInputChange}
              />
            </div>
            <div className='grid gap-3'>
              <Label htmlFor='paypal_email'>New Paypal Email</Label>
              <Input
                id='paypal_email'
                type='email'
                className='w-full'
                placeholder='test@email.com'
                value={formData.paypal_email}
                onChange={handleInputChange}
              />
            </div>
          </div>
          {loading ? (
            <Button disabled className='mt-5'>
              Please wait
              <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
            </Button>
          ) : (
            <Button className='mt-5' onClick={handleChangeClick}>
              Change
            </Button>
          )}
        </CardContent>
      </Card>
    </>
  )
}
