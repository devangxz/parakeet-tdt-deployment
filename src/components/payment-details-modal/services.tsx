'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'
import * as React from 'react'

import { ServicesInterface } from './types'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface Props {
  services: ServicesInterface
}

const spellingStyleLabels: { [key: string]: string } = {
  en_US: 'American',
  en_GB: 'British',
  en_AU: 'Australian',
  en_CA: 'Canadian',
}

const getSpellingStyleLabel = (locale: string): string =>
  spellingStyleLabels[locale] || 'Unknown'

export function Services({ services }: Props) {
  const [isOpen, setIsOpen] = React.useState(true)

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
          <div>
            Special instructions <br />
            <span className='text-sm font-normal'>
              {services?.specialInstructions}
            </span>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
