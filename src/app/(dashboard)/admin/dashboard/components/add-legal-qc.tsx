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

export default function AddLegalQC() {
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
      const response = await axiosInstance.post(
        `${BACKEND_URL}/admin/add-legal-qc`,
        {
          email: email,
          flag: true,
        }
      )
      if (response.status === 200) {
        toast.success('Successfully added to legal Editor.')
        setLoading(false)
      }
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        const errorToastId = toast.error(error.response?.data?.s)
        toast.dismiss(errorToastId)
      } else {
        toast.error(`Failed to add to legal Editor`)
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
      const response = await axiosInstance.post(
        `${BACKEND_URL}/admin/add-legal-qc`,
        {
          email: email,
          flag: false,
        }
      )
      if (response.status === 200) {
        toast.success('Successfully removed from legal Editor.')
        setLoadingDisable(false)
      }
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        const errorToastId = toast.error(error.response?.data?.s)
        toast.dismiss(errorToastId)
      } else {
        toast.error(`Failed to remove from legal Editor`)
      }
      setLoadingDisable(false)
    }
  }
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Add Legal Editor</CardTitle>
          <CardDescription>
            Please enter the editor email address to add it to legal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid gap-6'>
            <div className='grid gap-3'>
              <Label htmlFor='qc-email'>Editor Email</Label>
              <Input
                id='qc-email'
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
