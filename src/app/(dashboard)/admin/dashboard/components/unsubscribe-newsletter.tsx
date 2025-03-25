'use client'
import { ReloadIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import { toast } from 'sonner'

import { unsubscribeUserFromNewsletter } from '@/app/actions/user/unsubscribe'
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

export default function UnsubscribeNewsletter() {
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')

  const handleUnsubscribe = async () => {
    if (!email) {
      return toast.error('Please enter an email address')
    }

    if (!isValidEmail(email)) {
      return toast.error('Please enter a valid email address')
    }

    try {
      setIsLoading(true)
      const result = await unsubscribeUserFromNewsletter(email.toLowerCase())

      if (result.success) {
        toast.success('Successfully unsubscribed from newsletter')
        setEmail('')
      } else {
        toast.error('Failed to unsubscribe from newsletter')
      }
    } catch (error) {
      toast.error('An error occurred while processing your request')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Unsubscribe Newsletter</CardTitle>
        <CardDescription>
          Unsubscribe a user from receiving newsletter emails.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className='grid gap-6 mb-5'>
          <div className='grid gap-3'>
            <Label htmlFor='email'>Email</Label>
            <Input
              id='email'
              placeholder='user@example.com'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
        <Button onClick={handleUnsubscribe} disabled={isLoading}>
          {isLoading ? (
            <>
              <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
              Unsubscribing...
            </>
          ) : (
            'Unsubscribe'
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
