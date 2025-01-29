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
    <div className='lg:w-[70%] flex flex-1 flex-col p-4 gap-5'>
      <div
        className={`${
          apiKey ? 'border-b-2 border-customBorder pb-6' : ''
        } space-y-4`}
      >
        <HeadingDescription
          heading='API Key'
          description='The API key is required to access our REST API. The following is your key.'
        />
        <div className='pt-2 space-y-2.5'>
          <div className='grid w-full items-center gap-1.5'>
            <Label htmlFor='apiKey'>API Key</Label>
            <Input
              id='apiKey'
              type='text'
              value={apiKey ?? 'Click Generate to create your API key'}
              readOnly
            />
          </div>

          <div className='flex justify-end pt-2'>
            <div className='flex items-center gap-x-2'>
              {apiKey && (
                <>
                  <Button
                    variant='default'
                    className='w-full'
                    onClick={handleCopyApiKey}
                  >
                    Copy
                  </Button>

                  {isRemoving ? (
                    <Button disabled variant='destructive' className='w-full'>
                      Remove
                      <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
                    </Button>
                  ) : (
                    <Button
                      className='w-full'
                      variant='destructive'
                      onClick={handleRemoveApiKey}
                    >
                      Remove
                    </Button>
                  )}
                </>
              )}

              {isLoading ? (
                <Button disabled variant='default' className='w-full'>
                  Please wait
                  <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
                </Button>
              ) : (
                <Button
                  variant='default'
                  className='w-full'
                  onClick={handleGenerateApiKey}
                >
                  {apiKey ? 'Regenerate' : 'Generate'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {apiKey && (
        <div className='space-y-4'>
          <HeadingDescription heading='Webhook' />
          <div className='pt-2 space-y-2.5'>
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

            <div className='flex justify-end pt-2'>
              <div>
                {isUpdating ? (
                  <Button disabled variant='default' className='w-full'>
                    Update
                    <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
                  </Button>
                ) : (
                  <Button
                    variant='default'
                    className='w-full'
                    onClick={handleUpdateWebhook}
                  >
                    Update
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Page
