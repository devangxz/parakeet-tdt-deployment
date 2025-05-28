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

  const filterValue = column?.getFilterValue() as { dateRange?: [string, string] } | [string, string] | undefined

  React.useEffect(() => {
    let rangeValue: [string, string] | undefined
    
    if (Array.isArray(filterValue)) {
      rangeValue = filterValue
    } else if (filterValue && typeof filterValue === 'object' && 'dateRange' in filterValue) {
      rangeValue = filterValue.dateRange
    }

    if (!rangeValue) {
      setDateRange(undefined)
    } else if (Array.isArray(rangeValue) && rangeValue.length === 2) {
      setDateRange({
        from: new Date(rangeValue[0]),
        to: new Date(rangeValue[1])
      })
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

      // Get existing filter value to merge with
      const existingValue = column?.getFilterValue()
      let newFilterValue: { singleDate?: [string, string]; dateRange?: [string, string] }

      if (existingValue && typeof existingValue === 'object' && !Array.isArray(existingValue)) {
        // Merge with existing object filter
        newFilterValue = {
          ...existingValue,
          dateRange: [startDate.toISOString(), endDate.toISOString()]
        }
      } else {
        // Create new object filter
        newFilterValue = { dateRange: [startDate.toISOString(), endDate.toISOString()] }
      }

      column?.setFilterValue(newFilterValue)
    } else {
      // When clearing date range, preserve single date if it exists
      const existingValue = column?.getFilterValue()
      if (existingValue && typeof existingValue === 'object' && !Array.isArray(existingValue) && 'singleDate' in existingValue && existingValue.singleDate) {
        column?.setFilterValue({ singleDate: existingValue.singleDate })
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
