'use client'
import { ReloadIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import { toast } from 'sonner'

import { inviteCustomer } from '@/app/actions/admin/invite-customer'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import isValidEmail from '@/utils/isValidEmail'

export default function InviteCustomer() {
  const [formData, setFormData] = useState({ email: '', addFreeCredits: false })
  const [loading, setLoading] = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData((prevData) => ({ ...prevData, [id]: value }))
  }

  const handleCheckboxChange = (checked: boolean) => {
    setFormData((prevData) => ({ ...prevData, addFreeCredits: checked }))
  }

  const handleInviteClick = async () => {
    const { email, addFreeCredits } = formData

    if (!email) {
      toast.error('Please enter an email address.')
      return
    }

    if (!isValidEmail(email)) {
      toast.error('Please enter a valid email address.')
      return
    }

    try {
      setLoading(true)
      const result = await inviteCustomer({
        email: email.toLowerCase(),
        addFreeCredits,
      })

      if (result.success) {
        toast.success(result.message)
        setFormData({ email: '', addFreeCredits: false })
        setInviteUrl(result.inviteUrl || '')
      } else {
        toast.error(result.message || 'Failed to invite customer')
      }
    } catch (error) {
      toast.error('Failed to invite customer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Invite Customer</CardTitle>
          <CardDescription>
            Please enter the email address to send an invite a customer to sign
            up. A link will be sent to the email address with the account
            creation link. Please also share the invite link separately via
            email/chat as well.
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
                placeholder='customer@example.com'
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>
            <div className='flex items-center space-x-2'>
              <Checkbox
                id='addFreeCredits'
                checked={formData.addFreeCredits}
                onCheckedChange={handleCheckboxChange}
              />
              <Label
                htmlFor='addFreeCredits'
                className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
              >
                Add free $10 account credits
              </Label>
            </div>
          </div>
          {loading ? (
            <Button disabled className='mt-5'>
              Please wait
              <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
            </Button>
          ) : (
            <Button className='mt-5' onClick={handleInviteClick}>
              Send Invite
            </Button>
          )}
          <p className='text-sm text-gray-500'>
            {inviteUrl && (
              <a href={inviteUrl} target='_blank' rel='noopener noreferrer'>
                {inviteUrl}
              </a>
            )}
          </p>
        </CardContent>
      </Card>
    </>
  )
}
