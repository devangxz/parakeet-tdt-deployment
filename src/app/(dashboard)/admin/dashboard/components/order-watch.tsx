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

export default function OrderWatch() {
  const [loading, setLoading] = useState(false)
  const [loadingDisable, setLoadingDisable] = useState(false)
  const [email, setEmail] = useState('')

  const handleAddClick = async () => {
    if (!email) return toast.error('Please enter a valid email address')
    if (!isValidEmail(email)) {
      toast.error('Please enter a valid email address.')
      return
    }
    try {
      setLoading(true)
      const response = await axios.post(`/api/admin/add-order-watch`, {
        userEmail: email,
        flag: true,
      })
      if (response.data.success) {
        toast.success('Successfully added customer to order watch.')
      } else {
        toast.error(response.data.s || 'Failed to add customer to order watch')
      }
      setLoading(false)
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        const errorToastId = toast.error(error.response?.data?.s)
        toast.dismiss(errorToastId)
      } else {
        toast.error(`Failed to add customer to order watch`)
      }
      setLoading(false)
    }
  }
  const handleRemoveClick = async () => {
    if (!email) return toast.error('Please enter a valid email address')
    if (!isValidEmail(email)) {
      toast.error('Please enter a valid email address.')
      return
    }
    try {
      setLoadingDisable(true)
      const response = await axios.post(`/api/admin/add-order-watch`, {
        userEmail: email,
        flag: false,
      })
      if (response.data.success) {
        toast.success('Successfully removed customer from order watch.')
      } else {
        toast.error(
          response.data.s || 'Failed to remove customer from order watch'
        )
      }
      setLoadingDisable(false)
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        const errorToastId = toast.error(error.response?.data?.s)
        toast.dismiss(errorToastId)
      } else {
        toast.error(`Failed to remove customer from order watch`)
      }
      setLoadingDisable(false)
    }
  }
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Add Customer to Order Watch</CardTitle>
          <CardDescription>
            Please enter the customer email address to add it to order watch.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid gap-6'>
            <div className='grid gap-3'>
              <Label htmlFor='qc-email'>Customer Email</Label>
              <Input
                id='customer-email'
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
            <Button className='mt-5 mr-3' onClick={handleAddClick}>
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
              onClick={handleRemoveClick}
            >
              Remove
            </Button>
          )}
        </CardContent>
      </Card>
    </>
  )
}
