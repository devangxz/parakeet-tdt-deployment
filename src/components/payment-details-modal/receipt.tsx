'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'
import * as React from 'react'

import { ReceiptInterface } from './types'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import formatDateTime from '@/utils/formatDateTime'

interface Props {
  receipt: ReceiptInterface
}

export function Receipt({ receipt }: Props) {
  const [isOpen, setIsOpen] = React.useState(true)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className='mb-6 mr-5'>
      <div className='flex justify-between flex-wrap'>
        <div className='flex items-center gap-2'>
          <div className='text-md font-medium'>Receipt</div>
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
        {receipt?.invoiceType !== 'ADD_CREDITS' && (
          <div className='flex justify-between flex-wrap mt-5 text-md font-normal'>
            <div className='flex items-center gap-2'>
              <div>Services</div>
            </div>
            <div className='text-right'>{receipt?.services}</div>
          </div>
        )}

        <div className='flex justify-between flex-wrap mt-5 text-md font-normal'>
          <div className='flex items-center gap-2'>
            <div>Paid by</div>
          </div>
          <div className='text-right'>
            {receipt?.paidByName} ({receipt?.paidByEmail})
          </div>
        </div>
        <div className='flex justify-between flex-wrap mt-5 text-md font-normal'>
          <div className='flex items-center gap-2'>
            <div>Payment Method</div>
          </div>
          <div className='text-right'>{receipt?.paymentMethod}</div>
        </div>
        <div className='flex justify-between flex-wrap mt-5 text-md font-normal'>
          <div className='flex items-center gap-2'>
            <div>Charge amount</div>
          </div>
          <div className='text-right'>${receipt?.chargeAmount}</div>
        </div>
        <div className='flex justify-between flex-wrap mt-5 text-md font-normal text-red-500'>
          <div className='flex items-center gap-2'>
            <div>Refunded amount</div>
          </div>
          <div className='text-right'>${receipt?.refundedAmount}</div>
        </div>
        <div className='flex justify-between flex-wrap mt-5 text-md font-normal'>
          <div className='flex items-center gap-2'>
            <div>Net amount</div>
          </div>
          <div className='text-right'>${receipt?.netAmount}</div>
        </div>
        <div className='flex justify-between flex-wrap mt-5 text-md font-normal'>
          <div className='flex items-center gap-2'>
            <div>Transaction ID</div>
          </div>
          <div className='text-right'>{receipt?.transactionId}</div>
        </div>
        <div className='flex justify-between flex-wrap mt-5 text-md font-normal'>
          <div className='flex items-center gap-2'>
            <div>Date</div>
          </div>
          <div className='text-right'>
            {formatDateTime(receipt?.date ?? '')}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
