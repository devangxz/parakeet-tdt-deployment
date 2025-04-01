'use client'
import { ReloadIcon } from '@radix-ui/react-icons'
import { AxiosError } from 'axios'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { toast } from 'sonner'

import { switchUserAccount } from '@/app/actions/admin/access-account'
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
import { getRedirectPathByRole } from '@/utils/roleRedirect'

export default function AccountAccess() {
  const { data: session, update } = useSession()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAccessClick = async () => {
    if (!email) return toast.error('Please enter a valid email address')
    if (!isValidEmail(email)) {
      toast.error('Please enter a valid email address.')
      return
    }

    try {
      setLoading(true)
      const response = await switchUserAccount(email.toLowerCase())
      if (response.success) {
        const data = response?.details
        await update({
          ...session,
          user: {
            ...session?.user,
            token: data?.token,
            role: data?.role,
            userId: data?.userId,
            user: data?.user,
            email: data?.email,
            referralCode: data?.referralCode,
            legalEnabled: data?.legalEnabled,
            reviewEnabled: data?.reviewEnabled,
            generalFinalizerEnabled: data?.generalFinalizerEnabled,
            adminAccess: true,
            readonly: true,
            internalTeamUserId: data?.internalTeamUserId,
            teamName: data?.teamName,
            selectedUserTeamRole: data?.selectedUserTeamRole,
            customPlan: data?.customPlan,
            orderType: data?.orderType,
            organizationName: data?.organizationName,
          },
        })
        toast.success('Sucessfully switched to user')
        const redirectUrl = getRedirectPathByRole(data?.role || '')
        window.location.href = redirectUrl
      } else {
        toast.error(response?.s || 'Failed to access account')
      }
      setLoading(false)
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        const errorToastId = toast.error(error.response?.data?.s)
        toast.dismiss(errorToastId)
      } else {
        toast.error(`Failed to access account. Check the user email.`)
      }
      setLoading(false)
    }
  }
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Account Access</CardTitle>
          <CardDescription>
            Please enter the registered email address of the account below to
            access it. Please note that only readonly access is provided. You
            can only see the information, not change it. You have to request the
            user to make the change themselves and provide the instructions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid gap-6'>
            <div className='grid gap-3'>
              <Label htmlFor='name'>Registered Email Address</Label>
              <Input
                id='account-access-email'
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
            <Button className='mt-5' onClick={handleAccessClick}>
              Access
            </Button>
          )}
        </CardContent>
      </Card>
    </>
  )
}
