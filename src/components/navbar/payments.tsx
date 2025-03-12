'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

import Header from '@/app/transcribe/components/header'
import Profile from '@/components/navbar/profile'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

function PaymentsNavbar() {
  const { data: session } = useSession()
  const router = useRouter()
  const handleUpload = () => {
    router.push('/files/upload')
  }
  return (
    <>
      {session?.user?.role === 'TRANSCRIBER' ||
      session?.user?.role === 'QC' ||
      session?.user?.role === 'REVIEWER' ? (
        <Header />
      ) : (
        <div className='sticky top-0 z-50 bg-background border-b-2 border-customBorder'>
          <div className='flex justify-between items-center px-2 lg:px-4 py-4'>
            {/* <Link href='/'> */}
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
            {/* </Link> */}
            <div className='flex items-center gap-4'>
              {session?.user?.readonly && (
                <Badge
                  variant='outline'
                  className='w-fit lg:text-md text-sm text-primary bg-secondary border border-customBorder pt-1 pb-1 font-medium'
                >
                  Accessing `{session?.user?.email}` account
                </Badge>
              )}
              <Button
                variant='default'
                className='w-fit'
                onClick={handleUpload}
              >
                <Image
                  loading='lazy'
                  src='/assets/images/home/upload.svg'
                  className='w-5 aspect-square text-md mr-2'
                  alt='upload'
                  width={10}
                  height={10}
                />
                Upload File
              </Button>
              <Profile />
              <ThemeSwitcher />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default PaymentsNavbar
