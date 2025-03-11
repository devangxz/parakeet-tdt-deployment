'use client'

import { CalendarIcon } from '@radix-ui/react-icons'
import { Column } from '@tanstack/react-table'
import { format } from 'date-fns'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface DateFilterProps<TData, TValue> {
  column?: Column<TData, TValue>
}

export function DateFilter<TData, TValue>({
  column,
}: DateFilterProps<TData, TValue>) {
  const [date, setDate] = React.useState<Date>()

  const filterValue = column?.getFilterValue() as [string, string] | undefined

  React.useEffect(() => {
    if (!filterValue) {
      setDate(undefined)
    }
  }, [filterValue])

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate)
    if (selectedDate) {
      const startOfDay = new Date(selectedDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(selectedDate)
      endOfDay.setHours(23, 59, 59, 999)

      column?.setFilterValue([startOfDay.toISOString(), endOfDay.toISOString()])
    } else {
      column?.setFilterValue(undefined)
    }
  }

  return (
    <div className='flex items-center gap-2'>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant='outline'
            className={cn(
              'h-8 w-[180px] border-dashed not-rounded justify-start text-left font-normal'
            )}
          >
            <CalendarIcon className='mr-2 h-4 w-4' />
            {date ? format(date, 'PPP') : <span>Delivery Date Filter</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-auto p-0' align='start'>
          <Calendar
            mode='single'
            selected={date}
            onSelect={handleDateSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
