'use client'
import { ReloadIcon } from '@radix-ui/react-icons'
import { AxiosError } from 'axios'
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
import { BACKEND_URL } from '@/constants'
import axiosInstance from '@/utils/axios'
import isValidEmail from '@/utils/isValidEmail'

export default function Coupon() {
  const [formData, setFormData] = useState({
    email: '',
    couponCode: '',
    discount: '',
    validity: '',
  })
  const [loading, setLoading] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData((prevData) => ({ ...prevData, [id]: value }))
  }

  const handleGenerateClick = async () => {
    const { email, couponCode, discount, validity } = formData

    if (!email || !couponCode || !discount || !validity) {
      toast.error('Please fill in all fields.')
      return
    }

    if (!isValidEmail(email)) {
      toast.error('Please enter a valid email address.')
      return
    }

    if (!/^[A-Z0-9]+$/.test(couponCode)) {
      toast.error('Coupon code can contain only uppercase characters and 0-9.')
      return
    }

    if (isNaN(Number(discount)) || Number(discount) <= 0) {
      toast.error('Please enter a valid discount percentage.')
      return
    }

    if (isNaN(Number(validity)) || Number(validity) <= 0) {
      toast.error('Please enter a valid number of days for validity.')
      return
    }

    try {
      setLoading(true)
      const response = await axiosInstance.post(
        `${BACKEND_URL}/admin/add-coupon`,
        {
          email,
          couponCode,
          discount,
          validity,
        }
      )
      if (response.status === 200) {
        toast.success('Successfully Added Coupon.')
        setLoading(false)
      }
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        const errorToastId = toast.error(error.response?.data?.s)
        toast.dismiss(errorToastId)
      } else {
        toast.error(`Failed to add coupon.`)
      }
      setLoading(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Coupon</CardTitle>
          <CardDescription>
            Please enter the email address to issue a coupon. If the user
            already has an account, the link to the coupon will be shared.
            Please share the link separately via email/chat yourself as well.{' '}
            <br />
            The coupon code can contain only uppercase characters and 0-9. Eg.
            TESTMAR16.
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
              <Label htmlFor='couponCode'>Coupon Code</Label>
              <Input
                id='couponCode'
                type='text'
                className='w-full'
                placeholder='5'
                value={formData.couponCode}
                onChange={handleInputChange}
              />
            </div>
            <div className='grid gap-3'>
              <Label htmlFor='discount'>Discount (%)</Label>
              <Input
                id='discount'
                type='number'
                className='w-full'
                placeholder='5'
                value={formData.discount}
                onChange={handleInputChange}
              />
            </div>
            <div className='grid gap-3'>
              <Label htmlFor='validity'>Validity (Days)</Label>
              <Input
                id='validity'
                type='number'
                className='w-full'
                placeholder='5'
                value={formData.validity}
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
            <Button className='mt-5' onClick={handleGenerateClick}>
              Generate
            </Button>
          )}
        </CardContent>
      </Card>
    </>
  )
}
