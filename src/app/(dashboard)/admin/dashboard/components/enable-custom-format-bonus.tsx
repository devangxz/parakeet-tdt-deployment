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

export default function EnableCustomFormattingBonus() {
  const [loading, setLoading] = useState(false)
  const [loadingDisable, setLoadingDisable] = useState(false)
  const [email, setEmail] = useState('')

  const handleEnableClick = async () => {
    if (!email) return toast.error('Please enter a valid email address')
    if (!isValidEmail(email)) {
      toast.error('Please enter a valid email address.')
      return
    }
    try {
      setLoading(true)
      const response = await axios.post(
        `/api/admin/enable-custom-formatting-bonus`,
        {
          email: email,
          flag: true,
        }
      )
      if (response.data.success) {
        toast.success('Successfully enabled custom formatting bonus.')
      } else {
        toast.error(
          response.data.s || 'Failed to enable custom formatting bonus'
        )
      }
      setLoading(false)
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        const errorToastId = toast.error(error.response?.data?.s)
        toast.dismiss(errorToastId)
      } else {
        toast.error(`Failed to enable custom formatting bonus.`)
      }
      setLoading(false)
    }
  }
  const handleDisableClick = async () => {
    if (!email) return toast.error('Please enter a valid email address')
    if (!isValidEmail(email)) {
      toast.error('Please enter a valid email address.')
      return
    }

    try {
      setLoadingDisable(true)
      const response = await axios.post(
        `/api/admin/enable-custom-formatting-bonus`,
        {
          email: email,
          flag: false,
        }
      )
      if (response.data.success) {
        toast.success('Successfully disabled custom formatting bonus.')
      } else {
        toast.error(
          response.data.s || 'Failed to disable custom formatting bonus'
        )
      }
      setLoadingDisable(false)
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        const errorToastId = toast.error(error.response?.data?.s)
        toast.dismiss(errorToastId)
      } else {
        toast.error(`Failed to disable custom formatting bonus.`)
      }
      setLoadingDisable(false)
    }
  }
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Enable Custom Formatting Bonus</CardTitle>
          <CardDescription>
            Please enter the user email address to enable custom formatting
            bonus.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid gap-6'>
            <div className='grid gap-3'>
              <Label htmlFor='custom-email'>Email</Label>
              <Input
                id='custom-email'
                type='email'
                className='w-full'
                placeholder='test@email.com'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <Button disabled className='mt-5'>
              Please wait
              <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
            </Button>
          ) : (
            <Button className='mt-5 mr-3' onClick={handleEnableClick}>
              Enable
            </Button>
          )}

          {loadingDisable ? (
            <Button disabled className='mt-5'>
              Please wait
              <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
            </Button>
          ) : (
            <Button
              className='mt-5'
              variant='destructive'
              onClick={handleDisableClick}
            >
              Disable
            </Button>
          )}
        </CardContent>
      </Card>
    </>
  )
}
