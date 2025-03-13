'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'

import TranscriberProfile from './transcriberProfiles'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { Button } from '@/components/ui/button'

export default function Header() {
  const router = useRouter()
  return (
    <div className='sticky top-0 z-10 bg-background border-b-2 border-customBorder'>
      <div className='flex justify-between items-center px-2 lg:px-4 py-4'>
        <div className='flex items-center justify-center gap-5'>
          <div
            className='flex items-center justify-center gap-2 cursor-pointer'
            onClick={() => (window.location.href = '/')}
          >
            <Image
              loading='lazy'
              src='/assets/images/logo.svg'
              alt='Scribie'
              width={36}
              height={36}
            />
            <span className='inline font-semibold lg:text-3xl text-lg text-primary'>
              scribie
            </span>
          </div>
        </div>
        <div className='flex items-center gap-x-4'>
          <Button
            variant='default'
            className='w-full'
            onClick={() => router.push(`/transcribe/qc`)}
          >
            Dashboard
          </Button>
          <TranscriberProfile />
          <ThemeSwitcher />
        </div>
      </div>
    </div>
  )
}
