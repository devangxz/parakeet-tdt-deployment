'use client'

import { Cross2Icon } from '@radix-ui/react-icons'
import { Table } from '@tanstack/react-table'
import * as React from 'react'

import { DataTableFacetedFilter } from './filter'
import { DataTableViewOptions } from './view-options'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
interface DataTableToolbarProps<TData> {
  table: Table<TData>
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const [watchlistFilter, setWatchlistFilter] = React.useState<string>('all')
  const isFiltered = table.getState().columnFilters.length > 0

  const handleWatchlistChange = (value: string) => {
    setWatchlistFilter(value)
    if (value === 'customer') {
      table.getColumn('customerWatch')?.setFilterValue('true')
      table.getColumn('transcriberWatch')?.setFilterValue(null)
    } else if (value === 'transcriber') {
      table.getColumn('transcriberWatch')?.setFilterValue('true')
      table.getColumn('customerWatch')?.setFilterValue(null)
    } else {
      table.getColumn('customerWatch')?.setFilterValue(null)
      table.getColumn('transcriberWatch')?.setFilterValue(null)
    }
  }

  return (
    <div className='flex items-center justify-between'>
      <div className='flex flex-1 items-center space-x-2'>
        <Input
          placeholder='Search fileIds...'
          value={(table.getColumn('fileId')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('fileId')?.setFilterValue(event.target.value)
          }
          className='h-8 w-[150px] lg:w-[250px]'
        />
        {table.getColumn('orgName') && (
          <DataTableFacetedFilter
            column={table.getColumn('orgName')}
            title='Organization'
            options={[
              { value: 'REMOTELEGAL', label: 'Remote Legal' },
              { value: 'ACR', label: 'ACR' },
            ]}
          />
        )}
        {(table.getColumn('customerWatch') ||
          table.getColumn('transcriberWatch')) && (
          <div>
            <Select
              value={watchlistFilter}
              onValueChange={handleWatchlistChange}
            >
              <SelectTrigger className='h-8 w-[150px] lg:w-[250px] rounded border p-1 text-sm'>
                <SelectValue placeholder='Watchlist' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All</SelectItem>
                <SelectItem value='customer'>Customer Watch</SelectItem>
                <SelectItem value='transcriber'>Transcriber Watch</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {table.getColumn('status') && (
          <DataTableFacetedFilter
            column={table.getColumn('status')}
            title='Status'
            options={[
              { value: 'PENDING', label: 'Pending' },
              { value: 'TRANSCRIBED', label: 'Transcribed' },
              { value: 'QC_ASSIGNED', label: 'QC Assigned' },
              { value: 'QC_COMPLETED', label: 'QC Completed' },
              { value: 'FORMATTED', label: 'Formatted' },
              { value: 'REVIEWER_ASSIGNED', label: 'Reviewer Assigned' },
              { value: 'REVIEW_COMPLETED', label: 'Review Completed' },
              { value: 'FINALIZER_ASSIGNED', label: 'Finalizer Assigned' },
              { value: 'FINALIZING_COMPLETED', label: 'Finalizing Completed' },
              { value: 'BLOCKED', label: 'Blocked' },
              { value: 'PRE_DELIVERED', label: 'Pre-delivered' },
              {
                value: 'SUBMITTED_FOR_APPROVAL',
                label: 'Submitted for Approval',
              },
              {
                value: 'SUBMITTED_FOR_SCREENING',
                label: 'Submitted for Screening',
              },
            ]}
          />
        )}
        {isFiltered && (
          <Button
            variant='ghost'
            onClick={() => {
              table.resetColumnFilters()
              setWatchlistFilter('all')
            }}
            className='h-8 px-2 lg:px-3 not-rounded'
          >
            Reset
            <Cross2Icon className='ml-2 h-4 w-4' />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  )
}
