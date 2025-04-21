'use client'

import { CalendarIcon } from '@radix-ui/react-icons'
import { Column } from '@tanstack/react-table'
import { format } from 'date-fns'
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

interface DateRangeFilterProps<TData, TValue> {
  column?: Column<TData, TValue>
  title?: string
}

export function DateRangeFilter<TData, TValue>({
  column,
  title = 'Date Range',
}: DateRangeFilterProps<TData, TValue>) {
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>()

  const filterValue = column?.getFilterValue() as [string, string] | undefined

  React.useEffect(() => {
    if (!filterValue) {
      setDateRange(undefined)
    }
  }, [filterValue])

  const handleDateRangeSelect = (selectedDateRange: DateRange | undefined) => {
    setDateRange(selectedDateRange)

    if (selectedDateRange?.from) {
      const startDate = new Date(selectedDateRange.from)
      startDate.setHours(0, 0, 0, 0)

      let endDate: Date
      if (selectedDateRange.to) {
        endDate = new Date(selectedDateRange.to)
        endDate.setHours(23, 59, 59, 999)
      } else {
        endDate = new Date(selectedDateRange.from)
        endDate.setHours(23, 59, 59, 999)
      }

      column?.setFilterValue([startDate.toISOString(), endDate.toISOString()])
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
              'h-8 w-[220px] border-dashed not-rounded justify-start text-left font-normal'
            )}
          >
            <CalendarIcon className='mr-2 h-4 w-4' />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, 'MMM dd, yyyy')} -{' '}
                  {format(dateRange.to, 'MMM dd, yyyy')}
                </>
              ) : (
                format(dateRange.from, 'MMM dd, yyyy')
              )
            ) : (
              <span>{title}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-auto p-0' align='start'>
          <Calendar
            initialFocus
            mode='range'
            selected={dateRange}
            onSelect={handleDateRangeSelect}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
