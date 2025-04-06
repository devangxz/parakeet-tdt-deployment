'use client'
import { ReloadIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import { toast } from 'sonner'

import { changePaypalEmailAction } from '@/app/actions/admin/change-paypal-email'
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
      const result = await changePaypalEmailAction(
        formData.transcriber_email.toLowerCase(),
        formData.paypal_email
      )

      if (result.success) {
        toast.success('Successfully changed paypal email.')
      } else {
        toast.error(result.s || 'Failed to change paypal email')
      }
    } catch (error) {
      toast.error('Failed to change paypal email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Change Paypal Email (For Transcribers)</CardTitle>
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
