'use client'
import { ReloadIcon } from '@radix-ui/react-icons'
import React, { useState } from 'react'
import { toast } from 'sonner'

import { createApiKeyAction } from '@/app/actions/api-key/create'
import { removeApiKeyAction } from '@/app/actions/api-key/remove'
import { updateWebhookAction } from '@/app/actions/api-key/webhook'
import HeadingDescription from '@/components/heading-description'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface OptionProps {
  apiKey: string | null
  webhook: string | null
  success: boolean
}

const Page = ({ apiKeys }: { apiKeys: OptionProps }) => {
  const [apiKey, setApiKey] = useState(apiKeys.apiKey)
  const [webhook, setWebhook] = useState(apiKeys.webhook)
  const [isLoading, setIsLoading] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const handleGenerateApiKey = async () => {
    try {
      setIsLoading(true)
      const response = await createApiKeyAction()
      if (response.success && response.apiKey) {
        setApiKey(response.apiKey)
      } else {
        toast.error(response.message)
      }
    } catch (error) {
      toast.error('Failed to generate API key')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(apiKey ?? '')
    toast.success('API key copied to clipboard')
  }

  const handleRemoveApiKey = async () => {
    try {
      setIsRemoving(true)
      const response = await removeApiKeyAction()
      if (response.success) {
        setApiKey(null)
      } else {
        toast.error(response.message)
      }
    } catch (error) {
      toast.error('Failed to remove API key')
    } finally {
      setIsRemoving(false)
    }
  }

  const handleUpdateWebhook = async () => {
    if (!webhook) {
      toast.error('Webhook URL is required')
      return
    }
    try {
      setIsUpdating(true)
      const response = await updateWebhookAction(webhook)
      if (response.success) {
        toast.success('Webhook updated')
      } else {
        toast.error(response.message)
      }
    } catch (error) {
      toast.error('Failed to update webhook')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className='w-[80%] space-y-[1.25rem]'>
      <div className='w-[70%]'>
        <HeadingDescription
          heading='API Key'
          description='The API key is required to access our REST API. The following is your key.'
        />
      </div>

      <hr />

      <>
        <div className=''>
          <div className='grid w-full items-center gap-1.5'>
            <Label htmlFor='apiKey'>API Key</Label>
            <Input
              id='apiKey'
              type='text'
              value={apiKey ?? 'Click Generate to create your API key'}
              readOnly
            />
          </div>

          {apiKey && (
            <>
              <Button className='mt-5 mr-5' onClick={handleCopyApiKey}>
                Copy
              </Button>

              {isRemoving ? (
                <Button disabled className='mt-5'>
                  Please wait
                  <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
                </Button>
              ) : (
                <Button
                  className='mt-5 mr-5'
                  variant='destructive'
                  onClick={handleRemoveApiKey}
                >
                  Remove
                </Button>
              )}
            </>
          )}

          {isLoading ? (
            <Button disabled className='mt-5'>
              Please wait
              <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
            </Button>
          ) : (
            <Button className='mt-5' onClick={handleGenerateApiKey}>
              {apiKey ? 'Regenerate' : 'Generate'}
            </Button>
          )}
        </div>
      </>
      {apiKey && (
        <>
          <hr />

          <>
            <h1 className='text-lg font-semibold md:text-lg'>Webhook</h1>
            <div className=''>
              <div className='grid w-full items-center gap-1.5'>
                <Label htmlFor='apiKey'>URL</Label>
                <Input
                  id='apiKey'
                  type='text'
                  placeholder='https://example.com/webhook'
                  value={webhook ?? ''}
                  onChange={(e) => setWebhook(e.target.value)}
                />
              </div>

              {isUpdating ? (
                <Button disabled className='mt-5'>
                  Please wait
                  <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
                </Button>
              ) : (
                <Button className='mt-5' onClick={handleUpdateWebhook}>
                  Update
                </Button>
              )}
            </div>
          </>
        </>
      )}
    </div>
  )
}

export default Page
