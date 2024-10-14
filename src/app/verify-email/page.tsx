'use client'

import { ReloadIcon } from '@radix-ui/react-icons'
import axios from 'axios'
import { useSession } from 'next-auth/react'
import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'

import SideImage from '@/components/side-image'
import { Button } from '@/components/ui/button'

const VerifyAccount = () => {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (session?.user?.status === 'VERIFIED') {
      window.location.href = '/'
    }
  }, [session])

  const resendVerificationEmail = async () => {
    try {
      setIsLoading(true)
      const response = await axios.post(`/api/resend-verify-email`)
      if (response.data.success) {
        const tId = toast.success(`Successfully resend verification email!`)
        toast.dismiss(tId)
      } else {
        toast.error(`Failed to resend verification email`)
      }
      setIsLoading(false)
    } catch (error) {
      toast.error(`Failed to resend verification email`)
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className='w-full lg:grid lg:min-h-[600px] lg:grid-cols-2 xl:min-h-[800px]'>
        <SideImage />
        <div className='flex items-center justify-center py-12'>
          <div className='mx-auto grid w-[350px] gap-6'>
            <div className='grid gap-2 text-left'>
              <h1 className='text-4xl font-bold'>Verify Email</h1>
              <p className='text-muted-foreground'>
                Please verify your email to continue
              </p>
            </div>
            <p>
              We have sent an email to your registered address{' '}
              <b>{session?.user?.email}</b>. Please check your email and follow
              the link provided to complete the verification.
            </p>
            <p>
              Check your spam mail or bulk mail folder if you have not received
              it yet.
            </p>

            {isLoading ? (
              <Button disabled className='w-full'>
                <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                Please wait
              </Button>
            ) : (
              <Button
                type='submit'
                className='w-full'
                onClick={resendVerificationEmail}
              >
                Resent Verification Email
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default VerifyAccount
