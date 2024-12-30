'use client'
// import { Search } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

import Profile from '@/components/navbar/profile'
import { Button } from '@/components/ui/button'
// import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'

function DashboardNavbar() {
  const router = useRouter()
  const handleUpload = () => {
    router.push('/files/upload')
  }
  return (
    <>
      <div className='flex justify-between items-center w-[100%] m-auto my-6 px-4'>
        <div className='flex items-center justify-center gap-2'>
          <Image
            loading='lazy'
            src='/assets/images/logo.svg'
            alt='Scribie'
            width={36}
            height={36}
          />
          <span className='inline font-semibold lg:text-3xl text-lg'>
            Scribie
          </span>
        </div>
        {/* <div className='w-full flex-1 rounded-custom hidden lg:flex pl-[140px]'>
          <form>
            <div className='relative'>
              <Search className='absolute left-2.5 top-3 h-4 w-4 text-primary' />
              <Input
                type='search'
                placeholder='Search a file...'
                className='rounded-custom w-full appearance-none bg-[#F7F5FF] pl-8 shadow-none h-[40px]'
              />
            </div>
          </form>
        </div> */}
        <div className='flex gap-5'>
          <Image
            alt='Customer Support'
            loading='lazy'
            src='/assets/images/home/customer-support.svg'
            width={20}
            height={20}
          />
          <div className='mr-2'>
            <Button variant='default' className='w-full' onClick={handleUpload}>
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
          </div>
          <Profile />
        </div>
      </div>
      <Separator />
    </>
  )
}

export default DashboardNavbar
