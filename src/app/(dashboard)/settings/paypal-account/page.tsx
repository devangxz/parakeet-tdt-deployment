'use client'
import { ReloadIcon } from '@radix-ui/react-icons'
import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'

import { getAuthUrl } from '@/app/actions/paypal/auth-url'
import { getPaypalId, updatePaypalId } from '@/app/actions/paypal/id'
import { getUserInfo } from '@/app/actions/paypal/user-info'
import HeadingDescription from '@/components/heading-description'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

interface UserInfo {
  name: string
  email: string
  email_verified: boolean
}

const Page = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [id, setId] = useState<string>('N/A')

  const [loading, setLoading] = useState(true)
  const [updateLoading, setUpdateLoading] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)

  const fetchUserInfo = async (sessionId: string) => {
    try {
      const response = await getUserInfo(sessionId)
      if (response.success) {
        setUserInfo(response.user)
      } else {
        toast.error('Failed to login to PayPal')
      }
    } catch (error) {
      toast.error('Failed to login to PayPal')
    }
  }

  const fetchPaypalID = async (showLoader: boolean) => {
    try {
      if (showLoader) {
        setLoading(true)
      }
      const response = await getPaypalId()
      if (response.success) {
        setId(response.id ?? 'N/A')
      } else {
        toast.error('Failed to login to PayPal')
      }
      setLoading(false)
    } catch (error) {
      toast.error('Failed to login to PayPal')
      setLoading(false)
    }
  }

  const updatePaypalID = async () => {
    try {
      setUpdateLoading(true)
      const urlParams = new URLSearchParams(window.location.search)
      const sessionId = urlParams.get('session_id')
      if (!sessionId) {
        toast.error('Failed to update PayPal ID')
        setUpdateLoading(false)
        return
      }
      const response = await updatePaypalId(sessionId)
      if (response.success) {
        toast.success('PayPal ID account updated successfully')
        fetchPaypalID(false)
        setIsModalOpen(false)
        setUpdateLoading(false)
        const newUrl = window.location.pathname
        window.history.replaceState(null, '', newUrl)
      } else {
        toast.error('Failed to update to PayPal ID')
        setIsModalOpen(false)
        setUpdateLoading(false)
      }
    } catch (error) {
      toast.error('Failed to update to PayPal ID')
      setIsModalOpen(false)
      setUpdateLoading(false)
    }
  }

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const sessionId = urlParams.get('session_id')

    if (sessionId) {
      setIsModalOpen(true)
      fetchUserInfo(sessionId)
    }
    fetchPaypalID(true)
  }, [])

  const handleLogin = async () => {
    try {
      setLoginLoading(true)
      const response = await getAuthUrl()
      if (response.success) {
        window.open(response.url, '_blank')
      } else {
        toast.error('Failed to log in with PayPal')
      }
      setLoginLoading(false)
    } catch (error) {
      toast.error('Failed to log in with PayPal')
      setLoginLoading(false)
    }
  }

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '80vh',
        }}
      >
        <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className='w-[80%] space-y-[1.25rem]'>
      <div className='w-[70%]'>
        <HeadingDescription heading='PayPal Account' />
      </div>

      <hr />

      <div>
        <p>Your current PayPal account is:</p>
        <div className='border border-2 p-3 rounded-[5px] mt-2 mb-4'>{id}</div>
        <p>
          To change your PayPal account, click the button below and login so
          that we can check your Verified status. A{' '}
          <a
            href='https://www.paypal.com/be/cgi-bin/webscr?cmd=p/gen/verification-faq-outside'
            target='_blank'
            className='text-primary underline'
          >
            Verified PayPal account
          </a>{' '}
          (linked to a bank account or credit card) is a necessary requirement.
          The process is as follows:
        </p>
        <ul
          className='list-circle mt-3 mb-4 ml-6'
          style={{ listStyleType: 'circle' }}
        >
          <li>Click on Log In With PayPal button and complete the process.</li>
          <li>Take selfie with a government issued identification.</li>
          <li>
            Email the selfie to support@scribie.com from your new PayPal account
            email.
          </li>
        </ul>
        <p>
          We may have questions regarding your Scribie account and it has to be
          in good standing for updation.
        </p>
      </div>

      {loginLoading ? (
        <Button disabled>
          Please wait
          <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
        </Button>
      ) : (
        <Button type='submit' onClick={handleLogin}>
          Log In with PayPal
        </Button>
      )}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>PayPal Account Update</DialogTitle>
            <DialogDescription>
              {userInfo ? (
                <div className='mt-3 mb-3'>
                  {!userInfo.email_verified ? (
                    <p>
                      {' '}
                      Please link your bank account or credit card to your
                      PayPal account and try again. Please note that{' '}
                      <strong>Email confirmed</strong> is different from
                      <strong>Verified</strong> (
                      <a
                        href='https://www.paypal.com/us/selfhelp/article/what-does-a-verified-account-status-mean-faq1014'
                        target='_blank'
                        className='text-primary underline'
                      >
                        PayPal Help
                      </a>
                      ). Please contact PayPal support for more.{' '}
                    </p>
                  ) : (
                    <p>
                      Please click the Update button to request updation of your
                      PayPal account to <strong>{userInfo.email}</strong>.
                      Please send an email to support with your selfie and ID
                      proofs to complete the updation process.
                    </p>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '20vh',
                  }}
                >
                  <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                  <p>Loading...</p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='secondary' onClick={() => setIsModalOpen(false)}>
              Close
            </Button>

            {updateLoading ? (
              <Button disabled>
                Please wait
                <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
              </Button>
            ) : (
              <>
                {userInfo?.email_verified && (
                  <Button onClick={updatePaypalID}>Update</Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Page
