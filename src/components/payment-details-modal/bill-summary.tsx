'use client'

import { ColumnDef } from '@tanstack/react-table'
import { ChevronDown, ChevronUp } from 'lucide-react'
import * as React from 'react'

import { FileDataTable } from './file-table'
import { BillSummary, File } from './types'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { LOCALE } from '@/constants'
import formatDuration from '@/utils/formatDuration'

interface OrderOptionProps {
  billSummary: BillSummary
}

const formatDateStringToLongFormat = (isoString: string) => {
  const date = new Date(isoString)

  const formatter = new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  return formatter.format(date)
}

export function BillOptions({ billSummary }: OrderOptionProps) {
  const [isOpen, setIsOpen] = React.useState(true)

  const fileColumns: ColumnDef<File>[] = [
    {
      id: 'filename',
      header: 'File name',
      cell: ({ row }) => (
        <div className='font-medium'>{row.original.filename}</div>
      ),
    },
    {
      id: 'delivery_date',
      header: 'Delivery date',
      cell: ({ row }) => (
        <div className='font-medium'>
          {formatDateStringToLongFormat(row.original.delivery_date)}
        </div>
      ),
    },
    {
      id: 'duration',
      header: 'Mins',
      cell: ({ row }) => (
        <div className='font-medium'>
          {formatDuration(Number(row.original.duration))}
        </div>
      ),
    },
    {
      id: 'rate',
      header: 'Rate (per min)',
      cell: ({ row }) => (
        <div className='font-medium'>
          ${Number(row.original.rate).toFixed(2)}
        </div>
      ),
    },
    {
      id: 'amount',
      header: () => <div className='text-right'>Amount</div>,
      cell: ({ row }) => (
        <div className='font-medium text-right'>
          ${Number(row.original.amount).toFixed(2)}
        </div>
      ),
    },
  ]

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className='mb-6 mr-5'>
      <div className='flex justify-between flex-wrap'>
        <div className='flex items-center gap-2'>
          <div className='text-md font-medium'>Bill Summary</div>
        </div>
        <CollapsibleTrigger>
          {isOpen ? (
            <ChevronUp className='h-4 w-4 text-black cursor-pointer' />
          ) : (
            <ChevronDown className='h-4 w-4 text-black cursor-pointer' />
          )}
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className='mt-3'>
        <div className='max-h-[500px] overflow-y-auto'>
          <FileDataTable data={billSummary.files} columns={fileColumns} />
        </div>

        <div className='flex justify-between flex-wrap mt-3'>
          <div className='flex items-center gap-2'>
            <div className='text-md font-normal'>Total</div>
          </div>
          <div className='font-medium mr-2'>${billSummary.total}</div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
