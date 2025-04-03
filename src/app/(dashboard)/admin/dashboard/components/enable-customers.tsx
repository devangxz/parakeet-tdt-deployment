'use client'
import { ReloadIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import { toast } from 'sonner'

import {
  getEnabledCustomersAction,
  updateEnabledCustomersAction,
} from '@/app/actions/admin/enabled-customers'
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

export default function EnableCustomers() {
  const [isSearchLoading, setSearchLoading] = useState(false)
  const [isUpdateLoading, setUpdateLoading] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [enabledCustomers, setEnabledCustomers] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserEmail(e.target.value)
  }

  const handleCustomersChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEnabledCustomers(e.target.value)
  }

  const handleSearchClick = async () => {
    if (!userEmail) {
      toast.error('Please enter an email address.')
      return
    }

    if (!isValidEmail(userEmail)) {
      toast.error('Please enter a valid email address.')
      return
    }

    try {
      setSearchLoading(true)
      const response = await getEnabledCustomersAction(userEmail.toLowerCase())

      if (response.success) {
        toast.success('Successfully got enabled customers.')
        setEnabledCustomers(response.customers || '')
      } else {
        toast.error(response.message || 'Failed to get enabled customers')
      }
    } catch (error) {
      toast.error('Failed to get enabled customers')
    } finally {
      setSearchLoading(false)
    }
  }

  const handleUpdateClick = async () => {
    if (!userEmail || !isValidEmail(userEmail)) {
      toast.error('Please enter a valid email address.')
      return
    }

    if (!enabledCustomers) {
      toast.error('Please enter enabled customers.')
      return
    }

    try {
      setUpdateLoading(true)
      const response = await updateEnabledCustomersAction(
        userEmail.toLowerCase(),
        enabledCustomers
          .split(',')
          .map((customer) => customer.trim())
          .join(',')
      )

      if (response.success) {
        toast.success('Successfully updated enabled customers.')
      } else {
        toast.error(response.message || 'Failed to update enabled customers')
      }
    } catch (error) {
      toast.error('Failed to update enabled customers')
    } finally {
      setUpdateLoading(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Enable B2B Customers (For Transcribers)</CardTitle>
          <CardDescription>
            Please enter the transcriber email address to see and update their
            enabled b2b customers list. Add the org name to the list to enable
            the transcriber to work on that org. The list is comma separated.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid gap-6'>
            <div className='grid gap-3'>
              <Label htmlFor='userEmail'>Transcriber Email</Label>
              <Input
                id='userEmail'
                type='email'
                className='w-full'
                placeholder='test@email.com'
                value={userEmail}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {isSearchLoading ? (
            <Button disabled className='mt-5'>
              Please wait
              <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
            </Button>
          ) : (
            <Button className='mt-5 mb-3' onClick={handleSearchClick}>
              Search
            </Button>
          )}

          {enabledCustomers !== '' && (
            <div className='mt-5'>
              <Label>Enabled Customers</Label>
              <Textarea
                className='mt-2'
                value={enabledCustomers}
                onChange={handleCustomersChange}
                placeholder='Enter customer emails separated by commas'
              />

              {isUpdateLoading ? (
                <Button disabled className='mt-3'>
                  Please wait
                  <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
                </Button>
              ) : (
                <Button className='mt-3' onClick={handleUpdateClick}>
                  Update
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
