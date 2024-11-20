'use client'
import { ReloadIcon } from '@radix-ui/react-icons'
import axios from 'axios'
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

export default function EnablePreDelivery() {
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
      const response = await axios.post(`/api/admin/enable-pre-delivery`, {
        userEmail: email.toLowerCase(),
        flag: true,
      })
      if (response.data.success) {
        toast.success('Successfully enabled pre delivery.')
        setLoading(false)
      } else {
        toast.error(response.data.s)
        setLoading(false)
      }
    } catch (error) {
      toast.error('Failed to enable pre delivery..')
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
      const response = await axios.post(`/api/admin/enable-pre-delivery`, {
        userEmail: email.toLowerCase(),
        flag: false,
      })
      if (response.data.success) {
        toast.success('Successfully disabled pre delivery.')
        setLoadingDisable(false)
      } else {
        toast.error(response.data.s)
        setLoadingDisable(false)
      }
    } catch (error) {
      toast.error('Failed to disable pre delivery.')
      setLoadingDisable(false)
    }
  }
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Pre Delivery Customers</CardTitle>
          <CardDescription>
            Please enter the user customer address for checking pre delivery
            status.
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
              Add
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
              Remove
            </Button>
          )}
        </CardContent>
      </Card>
    </>
  )
}
