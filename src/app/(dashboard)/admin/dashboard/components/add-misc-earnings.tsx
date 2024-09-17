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

export default function AddMiscEarnings() {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    amount: '',
    reason: '',
  })

  const handleInputChange = (
    e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>
  ) => {
    const { id, value } = e.target
    setFormData((prevData) => ({ ...prevData, [id]: value }))
  }

  const handleSubmit = async () => {
    if (!formData.email) {
      toast.error('Please enter an email address.')
      return
    }

    if (!isValidEmail(formData.email)) {
      toast.error('Please enter a valid email address.')
      return
    }

    if (!formData.amount) {
      toast.error('Please enter amount.')
      return
    }

    if (!formData.reason) {
      toast.error('Please enter a reason.')
      return
    }

    try {
      setLoading(true)
      const response = await axiosInstance.post(
        `${BACKEND_URL}/admin/add-misc-earnings`,
        {
          email: formData.email,
          amount: formData.amount,
          reason: formData.reason,
        }
      )
      if (response.status === 200) {
        toast.success('Successfully added misc earnings')
        setLoading(false)
      }
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        const errorToastId = toast.error(error.response?.data?.s)
        toast.dismiss(errorToastId)
      } else {
        toast.error(`Failed to disabled Editor.`)
      }
      setLoading(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Add Misc Earnings</CardTitle>
          <CardDescription>
            Please enter the following details to add misc earnings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid gap-6'>
            <div className='grid gap-3'>
              <Label htmlFor='email'>Transcriber Email Address</Label>
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
              <Label htmlFor='comment'>Amount</Label>
              <Input
                id='amount'
                type='number'
                className='w-full'
                placeholder='Enter amount'
                value={formData.amount}
                onChange={handleInputChange}
              />
            </div>
            <div className='grid gap-3'>
              <Label htmlFor='comment'>Comment</Label>
              <Input
                id='reason'
                type='text'
                className='w-full'
                placeholder='Enter reason'
                value={formData.reason}
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
            <Button className='mt-5 mr-3' onClick={handleSubmit}>
              Add Earnings
            </Button>
          )}
        </CardContent>
      </Card>
    </>
  )
}
