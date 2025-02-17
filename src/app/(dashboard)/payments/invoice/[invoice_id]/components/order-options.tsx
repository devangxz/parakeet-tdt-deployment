'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'
import * as React from 'react'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Switch } from '@/components/ui/switch'

interface OrderOptionProps {
  id: string
  name: string
  isEnabled: boolean
  rate: number
  description: string
  onEnabledChange: (isEnabled: boolean) => void
}

export function OrderOptions({
  id,
  name,
  isEnabled,
  rate,
  description,
  onEnabledChange,
}: OrderOptionProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const toggleEnabled = () => {
    onEnabledChange(!isEnabled)
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className='mb-6 mr-5'>
      <div className='flex justify-between flex-wrap'>
        <div className='flex items-center gap-2'>
          <Switch
            id={`${id}-switch`}
            checked={isEnabled}
            onCheckedChange={toggleEnabled}
          />
          <div className='text-md font-medium ml-3'>{name}</div>
          <CollapsibleTrigger>
            {isOpen ? (
              <ChevronUp className='h-4 w-4 cursor-pointer' />
            ) : (
              <ChevronDown className='h-4 w-4 cursor-pointer' />
            )}
          </CollapsibleTrigger>
        </div>
        <div className='text-md font-normal'>{`+$${rate.toFixed(2)} / min`}</div>
      </div>
      <CollapsibleContent className='mt-3 font-normal text-sm text-muted-foreground'>
        {description}
      </CollapsibleContent>
    </Collapsible>
  )
}
