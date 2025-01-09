'use client'
import { ReloadIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import { toast } from 'sonner'

import { enableACRReview } from '@/app/actions/admin/enable-acr-review'
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

export default function EnableACRReview() {
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
      const response = await enableACRReview(email.toLowerCase(), true)

      if (response.success) {
        toast.success('Successfully enabled ACR review.')
      } else {
        toast.error(response.s || 'Failed to enable ACR review')
      }
    } catch (error) {
      toast.error('Failed to enable ACR review')
    } finally {
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
      const response = await enableACRReview(email.toLowerCase(), false)

      if (response.success) {
        toast.success('Successfully disabled ACR review.')
      } else {
        toast.error(response.s || 'Failed to disable ACR review')
      }
    } catch (error) {
      toast.error('Failed to disable ACR review')
    } finally {
      setLoadingDisable(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Enable ACR Finalize</CardTitle>
          <CardDescription>
            Please enter the user email address to enable ACR finalize. After
            enabling only the transcribers will see ACR finalize files.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid gap-6'>
            <div className='grid gap-3'>
              <Label htmlFor='custom-email'>TranscriberEmail</Label>
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
