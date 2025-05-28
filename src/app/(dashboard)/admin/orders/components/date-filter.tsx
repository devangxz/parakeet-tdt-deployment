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

  const filterValue = column?.getFilterValue() as { singleDate?: [string, string] } | { dateRange?: [string, string] } | [string, string] | undefined

  React.useEffect(() => {
    let dateValue: [string, string] | undefined

    if (Array.isArray(filterValue)) {
      dateValue = filterValue
    } else if (filterValue && typeof filterValue === 'object') {
      if ('singleDate' in filterValue) {
        dateValue = filterValue.singleDate
      }
    }

    if (!dateValue) {
      setDate(undefined)
    } else if (Array.isArray(dateValue) && dateValue.length === 2) {
      setDate(new Date(dateValue[0]))
    }
  }, [filterValue])

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate)
    if (selectedDate) {
      const startOfDay = new Date(selectedDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(selectedDate)
      endOfDay.setHours(23, 59, 59, 999)

      const existingValue = column?.getFilterValue()
      let newFilterValue: { singleDate?: [string, string]; dateRange?: [string, string] }

      if (existingValue && typeof existingValue === 'object' && !Array.isArray(existingValue)) {
        newFilterValue = {
          ...existingValue,
          singleDate: [startOfDay.toISOString(), endOfDay.toISOString()]
        }
      } else {
        newFilterValue = { singleDate: [startOfDay.toISOString(), endOfDay.toISOString()] }
      }
      column?.setFilterValue(newFilterValue)
    } else {
      // When clearing single date, preserve date range if it exists
      const existingValue = column?.getFilterValue()
      if (existingValue && typeof existingValue === 'object' && !Array.isArray(existingValue) && 'dateRange' in existingValue && existingValue.dateRange) {
        column?.setFilterValue({ dateRange: existingValue.dateRange })
      } else {
        column?.setFilterValue(undefined)
      }
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
