'use client'
import { ReloadIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import { toast } from 'sonner'

import { addUserFreeCredits } from '@/app/actions/admin/add-free-credits'
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

export default function AddCredits() {
  const [formData, setFormData] = useState({ email: '', credits: '' })
  const [loading, setLoading] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData((prevData) => ({ ...prevData, [id]: value }))
  }

  const handleAddCreditsClick = async () => {
    const { email, credits } = formData

    if (!email || !credits) {
      toast.error('Please fill in all fields.')
      return
    }

    if (!isValidEmail(email)) {
      toast.error('Please enter a valid email address.')
      return
    }

    const creditsNumber = parseInt(credits, 10)

    if (isNaN(creditsNumber) || creditsNumber <= 0) {
      toast.error('Please enter a valid credit amount.')
      return
    }

    try {
      setLoading(true)
      const result = await addUserFreeCredits(
        creditsNumber,
        email.toLowerCase()
      )

      if (result.success) {
        toast.success('Successfully added free credits')
      } else {
        toast.error(result.s || 'Failed to add free credits')
      }
    } catch (error) {
      toast.error('Failed to add free credits')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Add Credits</CardTitle>
          <CardDescription>
            Please enter the email address of an existing user to add free
            account credits.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid gap-6'>
            <div className='grid gap-3'>
              <Label htmlFor='credits'>Email Address</Label>
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
              <Label htmlFor='amount'>Credit Amount</Label>
              <Input
                id='credits'
                type='number'
                className='w-full'
                placeholder='5'
                value={formData.credits}
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
            <Button className='mt-5' onClick={handleAddCreditsClick}>
              Add Free Credits
            </Button>
          )}
        </CardContent>
      </Card>
    </>
  )
}
