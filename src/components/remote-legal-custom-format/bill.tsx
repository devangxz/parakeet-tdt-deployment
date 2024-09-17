import React from 'react'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Separator } from '@/components/ui/separator'
import { SUPPORT_EMAIL, SCRIBIE_PHONE } from '@/constants'

interface Payment {
  fileSize: number
  service: string
  baseRate: number
  discount: number
  totalAmount: number
  invoiceId: string
  creditsUsed: number
}

const Bill = ({ paymentInfo }: { paymentInfo: Payment | null }) => (
  <div>
    <div className='flex justify-between mr-5 mb-6'>
      <div className='flex items-center gap-2'>
        <div className='text-md font-medium'>Total Duration</div>
      </div>
      <div className='text-md font-normal'>
        {paymentInfo?.fileSize.toFixed(2)} min
      </div>
    </div>
    <div className='flex justify-between mr-5 mb-6'>
      <div className='flex items-center gap-2'>
        <div className='text-md font-medium'>Service</div>
      </div>
      <div className='text-md font-normal'>{paymentInfo?.service}</div>
    </div>
    <div className='flex justify-between mr-5 mb-6'>
      <div className='flex items-center gap-2'>
        <div className='text-md font-medium'>Base rate</div>
      </div>
      <div className='text-md font-normal'>
        ${paymentInfo?.baseRate.toFixed(2)} /min
      </div>
    </div>
    <div className='flex justify-between mr-5 mb-6'>
      <div className='flex items-center gap-2'>
        <div className='text-md font-medium'>Credits Used</div>
      </div>
      <div className='text-md font-normal'>${paymentInfo?.creditsUsed}</div>
    </div>
    <div className='flex justify-between mr-5 mb-6'>
      <div className='flex items-center gap-2'>
        <div className='text-md font-medium'>Discount</div>
      </div>
      <div className='text-md font-normal text-[#00B98C]'>
        ${paymentInfo?.discount}
      </div>
    </div>
    <Separator className='bg-[#322078]' />
    <div className='flex justify-between mr-5 mb-4 mt-4'>
      <div className='flex items-center gap-2'>
        <div className='text-lg font-semibold'>Final amount</div>
      </div>
      <div className='text-lg font-semibold'>
        ${paymentInfo?.totalAmount.toFixed(2)}
      </div>
    </div>
    <Separator className='bg-[#322078]' />
    <Separator className='bg-[#322078]' />

    <Accordion type='single' collapsible className='w-full'>
      <AccordionItem value='item-1'>
        <AccordionTrigger>Terms & Conditions</AccordionTrigger>
        <AccordionContent>
          <div className='flex justify-between mt-4'>
            <ul className='list-square text-[12px] text-muted-foreground'>
              <li>1. All amounts are in USD.</li>
              <li>
                <div>
                  2.
                  <a
                    href='/customer-guide#manual-deliveries'
                    className='text-primary'
                    target='_blank'
                  >
                    Delivery
                  </a>{' '}
                  dates are approximate. Files may experience delays due to
                  holidays, weekends, high workload, or audio issues.{' '}
                  <a href='/' className='text-primary'>
                    contact support.
                  </a>
                </div>
              </li>
              <li>
                3.
                <a
                  href='/customer-guide#additional-charges'
                  className='text-primary'
                  target='_blank'
                >
                  Additional charges{' '}
                </a>
                may apply for files with non-American accents, poor audio
                quality, distortions, distant speakers, or high background
                noise. A full refund will be issued if these charges are
                unacceptable or if the file cannot be transcribed.
              </li>
              <li>
                4. For inquiries, please email{' '}
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className='text-primary underline'
                >
                  {SUPPORT_EMAIL}{' '}
                </a>{' '}
                or call {SCRIBIE_PHONE}.
              </li>
            </ul>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </div>
)

export default Bill
