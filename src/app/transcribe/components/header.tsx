'use client'

import { Menu } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

import TranscriberProfile from './transcriberProfiles'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { Button } from '@/components/ui/button'

export default function Header({ setIsExpanded, isExpanded }: { setIsExpanded: (isExpanded: boolean) => void, isExpanded: boolean }) {
  const router = useRouter()
  return (
    <div className='sticky top-0 z-50 bg-background border-b-2 border-customBorder'>
      <div className='flex justify-between items-center px-2 lg:px-4 py-4'>

      <div className="flex items-center gap-6">
        <Menu className='w-5 h-5 cursor-pointer' onClick={() => setIsExpanded(!isExpanded)}/>
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
