'use client'

import { Check, ChevronDown, ChevronUp, Pencil, X } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

import { ServicesInterface } from './types'
import { updateSpecialInstructions } from '@/app/actions/invoice/update-special-instructions'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface Props {
  services: ServicesInterface
  invoiceId: string
}

const spellingStyleLabels: { [key: string]: string } = {
  en_US: 'American',
  en_GB: 'British',
  en_AU: 'Australian',
  en_CA: 'Canadian',
}

const getSpellingStyleLabel = (locale: string): string =>
  spellingStyleLabels[locale] || 'Unknown'

export function Services({ services, invoiceId }: Props) {
  const [isOpen, setIsOpen] = React.useState(true)
  const [isEditingInstructions, setIsEditingInstructions] =
    React.useState(false)
  const [instructions, setInstructions] = React.useState(
    services.specialInstructions ?? ''
  )
  const [isSaving, setIsSaving] = React.useState(false)

  const handleSaveInstructions = async () => {
    if (!invoiceId) return

    setIsSaving(true)
    try {
      const result = await updateSpecialInstructions({
        invoiceId,
        instructions,
      })

      if (result.success) {
        toast.success('Special instructions updated successfully')
        setIsEditingInstructions(false)
      } else {
        toast.error(result.message || 'Failed to update special instructions')
      }
    } catch (error) {
      toast.error('An error occurred while updating special instructions')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setInstructions(services.specialInstructions)
    setIsEditingInstructions(false)
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className='mb-6 mr-5'>
      <div className='flex justify-between flex-wrap'>
        <div className='flex items-center gap-2'>
          <div className='text-md font-medium'>Services</div>
        </div>
        <CollapsibleTrigger>
          {isOpen ? (
            <ChevronUp className='h-4 w-4 text-black cursor-pointer' />
          ) : (
            <ChevronDown className='h-4 w-4 text-black cursor-pointer' />
          )}
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className='mt-3'>
        <div className='flex justify-between flex-wrap mt-3 text-md font-medium'>
          <div>
            Order options <br />
            <span className='text-sm font-normal'>
              {services?.orderOptions}
            </span>
          </div>
          <div className='text-right'>
            Speaker name format <br />
            <span className='text-sm font-normal'>
              {services?.speakerNameFormat}
            </span>
          </div>
        </div>
        <div className='flex justify-between flex-wrap mt-5 text-md font-medium'>
          <div>
            Transcript template <br />
            <span className='text-sm font-normal'>
              {services.transcriptTemplate}
            </span>
          </div>
          <div className='text-right'>
            Spelling type <br />
            <span className='text-sm font-normal'>
              {getSpellingStyleLabel(services?.spellingStyle)}
            </span>
          </div>
        </div>
        <div className='flex justify-between flex-wrap mt-5 text-md font-medium'>
          <div className='w-full'>
            <div className='flex justify-between items-center'>
              <div>Special instructions</div>
              {!isEditingInstructions ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => setIsEditingInstructions(true)}
                        className='h-8 px-2'
                      >
                        <Pencil className='h-4 w-4' />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit instructions</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <div className='flex space-x-2'>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={handleCancelEdit}
                          className='h-8 px-2'
                          disabled={isSaving}
                        >
                          <X className='h-4 w-4 text-destructive' />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Cancel editing</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={handleSaveInstructions}
                          className='h-8 px-2'
                          disabled={isSaving}
                        >
                          <Check className='h-4 w-4 text-primary' />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Save instructions</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>
            {!isEditingInstructions ? (
              <span className='text-sm font-normal block mt-2 whitespace-pre-line'>
                {instructions}
              </span>
            ) : (
              <Textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder='Enter special instructions here'
                className='mt-2'
                rows={4}
                disabled={isSaving}
              />
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
