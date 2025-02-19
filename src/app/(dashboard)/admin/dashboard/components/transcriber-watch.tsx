'use client'
import { ReloadIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import { toast } from 'sonner'

import { updateTranscriberWatchAction } from '@/app/actions/admin/transcriber-watch'
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

export default function TranscriberWatch() {
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
      const response = await updateTranscriberWatchAction(
        email.toLowerCase(),
        true
      )

      if (response.success) {
        toast.success('Successfully added transcriber to watchlist.')
      } else {
        toast.error(response.s || 'Failed to add transcriber to watchlist')
      }
    } catch (error) {
      toast.error('Failed to add transcriber to watchlist')
    } finally {
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
      const response = await updateTranscriberWatchAction(
        email.toLowerCase(),
        false
      )

      if (response.success) {
        toast.success('Successfully removed transcriber from watchlist.')
      } else {
        toast.error(response.s || 'Failed to remove transcriber from watchlist')
      }
    } catch (error) {
      toast.error('Failed to remove customer from order watch')
    } finally {
      setLoadingDisable(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Add Transcriber to Watchlist</CardTitle>
          <CardDescription>
            Please enter the transcriber email address to add it to watchlist.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid gap-6'>
            <div className='grid gap-3'>
              <Label htmlFor='qc-email'>Transcriber Email</Label>
              <Input
                id='transcriber-email'
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
