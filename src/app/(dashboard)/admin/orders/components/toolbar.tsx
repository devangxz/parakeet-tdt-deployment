'use client'

import { Cross2Icon } from '@radix-ui/react-icons'
import { Table } from '@tanstack/react-table'

import { DataTableFacetedFilter } from './filter'
import { DataTableViewOptions } from './view-options'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface DataTableToolbarProps<TData> {
  table: Table<TData>
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

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
            onClick={() => table.resetColumnFilters()}
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
