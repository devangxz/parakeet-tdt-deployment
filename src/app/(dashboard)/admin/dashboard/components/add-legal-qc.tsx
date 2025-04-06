'use client'
import { ReloadIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import { toast } from 'sonner'

import { addLegalQC } from '@/app/actions/admin/add-legal-qc'
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
      const result = await addLegalQC(email.toLowerCase(), true)
      if (result.success) {
        toast.success('Successfully added to legal Editor.')
      } else {
        toast.error(result.s || 'Failed to add to legal Editor')
      }
    } catch (error) {
      toast.error('Failed to add to legal Editor')
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
      const result = await addLegalQC(email.toLowerCase(), false)
      if (result.success) {
        toast.success('Successfully removed from legal Editor.')
      } else {
        toast.error(result.s || 'Failed to remove from legal Editor')
      }
    } catch (error) {
      toast.error('Failed to remove from legal Editor')
    } finally {
      setLoadingDisable(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Add Legal Editor (For QCs)</CardTitle>
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
