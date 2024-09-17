'use client'

import NextImage from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import TranscriberProfile from './transcriberProfiles'
import { Button } from '@/components/ui/button'

export default function Header() {
  const router = useRouter()
  return (
    <header className='bg-white px-4 flex justify-between items-center py-2 shadow'>
      <div>
        <div className='flex items-center w-28 justify-between'>
          <div className='flex h-8 items-center px-4 lg:h-[60px] lg:px-6'>
            <Link
              href='/'
              className='flex items-center justify-center gap-2 font-semibold'
            >
              <NextImage
                src='/assets/images/logo.svg'
                alt='scribie'
                width={30}
                height={30}
              />
              <span className='text-2xl'>scribie</span>
            </Link>
          </div>
          <span>Transcriber</span>
        </div>
      </div>
      <div className='flex gap-5'>
        <div className='mr-2'>
          <Button
            variant='default'
            className='w-full'
            onClick={() => router.push(`/transcribe/qc`)}
          >
            Dashboard
          </Button>
        </div>
        <div>
          <TranscriberProfile />
        </div>
      </div>
    </header>
  )
}
