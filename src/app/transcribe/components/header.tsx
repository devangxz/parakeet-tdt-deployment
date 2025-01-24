'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import TranscriberProfile from './transcriberProfiles'
import { Button } from '@/components/ui/button'

export default function Header() {
  const router = useRouter()
  return (
    <div className='sticky top-0 z-50 bg-white border-b-2 border-customBorder'>
      <div className='flex justify-between items-center px-2 lg:px-4 py-4'>
        <div className='flex items-center justify-center gap-5'>
          <Link href='/'>
            <div className='flex items-center justify-center gap-2'>
              <Image
                loading='lazy'
                src='/assets/images/logo.svg'
                alt='Scribie'
                width={36}
                height={36}
              />
              <span className='inline font-semibold lg:text-3xl text-lg'>
                scribie
              </span>
            </div>
          </Link>
          <span className='text-gray-700 font-medium text-lg'>Transcriber</span>
        </div>
        <div className='flex gap-4'>
          <Button
            variant='default'
            className='w-full'
            onClick={() => router.push(`/transcribe/qc`)}
          >
            Dashboard
          </Button>
          <TranscriberProfile />{' '}
        </div>
      </div>
    </div>
  )
}
