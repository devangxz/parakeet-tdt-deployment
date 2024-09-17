'use client'

import { ColumnDef } from '@tanstack/react-table'
import { ChevronDown, ChevronUp } from 'lucide-react'
import * as React from 'react'

import { FileDataTable } from './file-table'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface OrderOptionProps {
  amount: number
  total: number
}

interface Table {
  id: number
  description: string
  amount: number
}

export function AddCreditBillOptions({ amount, total }: OrderOptionProps) {
  const [isOpen, setIsOpen] = React.useState(true)

  const tableColumns: ColumnDef<Table>[] = [
    {
      id: 'id',
      header: 'SL.',
      cell: ({ row }) => <div className='font-medium'>{row.original.id}</div>,
    },
    {
      id: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <div className='font-medium'>{row.original.description}</div>
      ),
    },
    {
      id: 'amount',
      header: () => <div className='text-right'>Amount</div>,
      cell: ({ row }) => (
        <div className='font-medium text-right'>${row.original.amount}</div>
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
        <FileDataTable
          data={[
            {
              id: 1,
              description: 'Add account credits',
              amount,
            },
          ]}
          columns={tableColumns}
        />
        <div className='flex justify-between flex-wrap mt-3'>
          <div className='flex items-center gap-2'>
            <div className='text-md font-normal'>Total</div>
          </div>
          <div className='font-medium mr-2'>${total}</div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
