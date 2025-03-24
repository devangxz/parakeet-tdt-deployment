'use client'

import { ReloadIcon } from '@radix-ui/react-icons'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import { unsubscribeUserFromNewsletter } from '../actions/user/unsubscribe'

interface UnsubscribeState {
  status: 'loading' | 'success' | 'error'
  message: string
}

export function UnsubscribeContent() {
  const searchParams = useSearchParams()
  const [state, setState] = useState<UnsubscribeState>({
    status: 'loading',
    message: 'Processing your request...',
  })

  useEffect(() => {
    async function processUnsubscribe() {
      try {
        if (!searchParams) {
          setState({
            status: 'error',
            message: 'Error accessing URL parameters.',
          })
          return
        }

        const email = searchParams.get('email')

        if (!email) {
          setState({
            status: 'error',
            message: 'No email address provided in the URL.',
          })
          return
        }

        const result = await unsubscribeUserFromNewsletter(
          decodeURIComponent(email)
        )

        if (result.success) {
          setState({
            status: 'success',
            message: result.message,
          })
        } else {
          setState({
            status: 'error',
            message: result.message,
          })
        }
      } catch (error) {
        setState({
          status: 'error',
          message:
            'An unexpected error occurred while processing your request.',
        })
      }
    }

    processUnsubscribe()
  }, [searchParams])

  return (
    <div className='flex flex-col items-center text-center'>
      {state.status === 'loading' && (
        <div className='flex flex-col items-center space-y-4'>
          <ReloadIcon className='h-4 w-4 animate-spin' />
          <p>{state.message}</p>
        </div>
      )}

      {state.status === 'success' && (
        <div className='flex flex-col items-center space-y-4'>
          <CheckCircle className='h-12 w-12 text-green-500' />
          <p className='text-green-700'>{state.message}</p>
        </div>
      )}

      {state.status === 'error' && (
        <div className='flex flex-col items-center space-y-4'>
          <AlertCircle className='h-12 w-12 text-red-500' />
          <p className='text-red-700'>{state.message}</p>
        </div>
      )}
    </div>
  )
}
