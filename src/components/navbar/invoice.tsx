'use client'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

function InvoiceNavbar({ orderType }: { orderType: string }) {
  const router = useRouter()
  return (
    <div className='flex justify-between items-center w-[100%] m-auto my-6 px-4'>
      <div className='flex items-center justify-center lg:gap-5 gap-3'>
        <Link href='/'>
          <Image
            loading='lazy'
            src='/assets/images/logo.svg'
            alt='Scribie'
            width={36}
            height={36}
          />
        </Link>

        <span className='inline font-medium text-lg'>Checkout</span>
        <Badge
          variant='outline'
          className='lg:text-md text-sm text-primary bg-violet-100 pt-1 pb-1 font-medium'
        >
          {orderType}
        </Badge>
      </div>

      <div>
        <Button onClick={() => router.push('/files/upload')}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  )
}

export default InvoiceNavbar
