'use client'

import { ReloadIcon } from '@radix-ui/react-icons'
import { Mail, MailCheck } from 'lucide-react'
import { useSession } from 'next-auth/react'
import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'

import { resendVerificationEmail } from '@/app/actions/resend-verify-email'
import SideImage from '@/components/side-image'
import { Button } from '@/components/ui/button'

const VerifyEmail = () => {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (session?.user?.status === 'VERIFIED') {
      window.location.href = '/'
    }
  }, [session])

  const handleResendVerificationEmail = async () => {
    try {
      setIsLoading(true)
      const response = await resendVerificationEmail()
      if (response.success) {
        const tId = toast.success(`Successfully resend verification email!`)
        toast.dismiss(tId)
      } else {
        toast.error(response.message || 'Failed to resend verification email')
      }
    } catch (error) {
      toast.error(`Failed to resend verification email`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='w-full lg:grid lg:grid-cols-2'>
      <SideImage />
      <div className='flex items-center justify-center px-4 py-12 lg:px-8'>
        <div className='w-full max-w-sm space-y-5'>
          <div className='space-y-2.5 mb-6 text-center lg:text-left'>
            <div>
              <h1 className='text-4xl font-semibold tracking-tight'>
                Verify Email
              </h1>
              <p className='mt-2 text-md text-muted-foreground'>
                Please verify your email to continue
              </p>
            </div>
          </div>

          <div className='space-y-7'>
            <div className='rounded-xl border border-primary/10 bg-secondary px-4 py-3'>
              <div className='flex items-center gap-2 mb-2.5'>
                <Mail className='h-5 w-5 text-primary' />
                <h3 className='text-lg font-semibold text-muted-foreground'>
                  Check your inbox
                </h3>
              </div>
              <div className='space-y-1.5'>
                <p className='text-md text-muted-foreground'>
                  We have sent a verification email to{' '}
                  <span className='font-medium text-primary'>
                    {session?.user?.email}
                  </span>
                  . Click the link in the email to verify your account.
                </p>
                <p className='text-md text-muted-foreground'>
                  Can&apos;t find the email? Check your spam folder or bulk mail
                  folder.
                </p>
              </div>
            </div>

            <div className='text-center'>
              <p className='text-sm text-muted-foreground mb-2.5'>
                Haven&apos;t received the email yet?
              </p>
              <Button
                disabled={isLoading}
                onClick={handleResendVerificationEmail}
                className='w-full'
              >
                {isLoading ? (
                  <>
                    <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                    Please Wait
                  </>
                ) : (
                  <>
                    <MailCheck className='mr-2 h-4 w-4' />
                    Resend Verification Email
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VerifyEmail
