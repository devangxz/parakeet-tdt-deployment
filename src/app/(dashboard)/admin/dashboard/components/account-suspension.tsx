'use client'
import { ReloadIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import { toast } from 'sonner'

import { suspendAccount } from '@/app/actions/admin/suspend-account'
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

export default function AccountSuspension() {
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

  const handleSuspendClick = async () => {
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
      const result = await suspendAccount(formData.email.toLowerCase(), true)

      if (result.success) {
        toast.success('Account suspended successfully.')
      } else {
        toast.error(result.s || 'Failed to suspend account')
      }
    } catch (error) {
      toast.error('Failed to suspend account.')
    } finally {
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
      const result = await suspendAccount(formData.email.toLowerCase(), false)

      if (result.success) {
        toast.success('Account reinstated successfully.')
      } else {
        toast.error(result.s || 'Failed to reinstate account')
      }
    } catch (error) {
      toast.error('Failed to reinstate the account.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Account Suspension</CardTitle>
          <CardDescription>
            Please enter the user email address for suspending their account.
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
              onClick={handleSuspendClick}
            >
              Suspend
            </Button>
          )}
          {loading ? (
            <Button disabled className='mt-5'>
              Please wait
              <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
            </Button>
          ) : (
            <Button className='mt-5' onClick={handleEnableClick}>
              Reinstate
            </Button>
          )}
        </CardContent>
      </Card>
    </>
  )
}
