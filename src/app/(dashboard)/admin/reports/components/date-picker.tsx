'use client'

import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  date: Date
  setDate: React.Dispatch<React.SetStateAction<Date>>
  className?: string
  placeholder?: string
}

export function DatePicker({
  date,
  setDate,
  className,
}: DatePickerProps) {
  return (
    <div className={cn('grid gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant={'order'} className={cn('not-rounded')}>
            <CalendarIcon className='mr-2 h-4 w-4' />
            {format(date, 'LLL dd, y')}
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-auto p-0' align='start'>
          <Calendar
            initialFocus
            mode='single'
            selected={date}
            onSelect={(selectedDate) => selectedDate && setDate(selectedDate)}
            numberOfMonths={1}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
