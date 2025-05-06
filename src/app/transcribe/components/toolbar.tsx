'use client'
import { Cross2Icon } from '@radix-ui/react-icons'
import { Table } from '@tanstack/react-table'
import * as React from 'react'

import { DataTableFacetedFilter } from './table-filter'
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
    <div className='flex flex-wrap items-center justify-between p-2'>
      <div className='flex items-center space-x-2'>
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
            options={Array.from(
              table.getColumn('orgName')?.getFacetedUniqueValues().keys() || []
            ).map((value) => ({ label: String(value), value: String(value) }))}
          />
        )}
        {table.getColumn('diff') && (
          <DataTableFacetedFilter
            column={table.getColumn('diff')}
            title='Difficulty'
            options={[
              { label: 'Low', value: 'LOW' },
              { label: 'Medium', value: 'MEDIUM' },
              { label: 'High', value: 'HIGH' },
            ]}
          />
        )}
        {/* Custom Formatting Filter */}
        {table.getColumn('isCustomFormat') && (
          <DataTableFacetedFilter
            column={table.getColumn('isCustomFormat')}
            title='Custom Formatting'
            options={[
              { label: 'CF Files Only', value: 'YES' },
              { label: 'Non-CF Files', value: 'NO' },
            ]}
          />
        )}
        {/* Duration Filter */}
        {table.getColumn('duration') && (
          <DataTableFacetedFilter
            column={table.getColumn('duration')}
            title='Duration'
            options={[
              { label: '<2 hours', value: 'lt2' },
              { label: '2-3 hours', value: '2to3' },
              { label: '>3 hours', value: 'gt3' },
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
    </div>
  )
}
