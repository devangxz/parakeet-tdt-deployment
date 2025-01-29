'use client'
import Image from 'next/image'
import Link from 'next/link'

import Profile from '@/components/navbar/profile'
import { Badge } from '@/components/ui/badge'

function InvoiceNavbar({ orderType }: { orderType: string }) {
  return (
    <div className='sticky top-0 z-50 bg-white border-b-2 border-customBorder'>
      <div className='flex items-center justify-between px-2 lg:px-4 py-4'>
        <div className='flex items-center gap-x-5'>
          <Link href='/'>
            <Image
              loading='lazy'
              src='/assets/images/logo.svg'
              alt='Scribie'
              width={36}
              height={36}
            />
          </Link>

          <div className='flex items-center gap-x-2'>
            <span className='inline font-medium text-lg'>Checkout</span>
            <Badge
              variant='outline'
              className='lg:text-md text-sm text-primary bg-violet-100 pt-1 pb-1 font-medium'
            >
              {orderType}
            </Badge>
          </div>
        </div>
        <Profile />
      </div>
    </div>
  )
}

export default InvoiceNavbar
