'use client'

import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import * as React from 'react'
import { DateRange } from 'react-day-picker'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface DateRangePickerProps {
  value?: DateRange
  onChange: (value: DateRange | undefined) => void
  onUpdate: () => void
  className?: string
}

export function DateRangePicker({
  value,
  onChange,
  onUpdate,
  className,
}: DateRangePickerProps) {
  return (
    <div className={cn('grid gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id='date'
            variant={'order'}
            className={cn(
              'w-[300px] justify-start text-left font-normal not-rounded',
              !value && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className='mr-2 h-4 w-4' />
            {value?.from ? (
              value.to ? (
                <>
                  {format(value.from, 'LLL dd, y')} -{' '}
                  {format(value.to, 'LLL dd, y')}
                </>
              ) : (
                format(value.from, 'LLL dd, y')
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-auto p-0' align='start'>
          <Calendar
            initialFocus
            mode='range'
            defaultMonth={value?.from}
            selected={value}
            onSelect={(newValue) => {
              onChange(newValue)
              if (newValue?.from && newValue?.to) {
                onUpdate()
              }
            }}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
