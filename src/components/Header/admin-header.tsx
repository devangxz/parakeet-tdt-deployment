'use client'
import Image from 'next/image'

import Profile from '@/components/navbar/profile'
import MobileSidebar from '@/components/Sidebar/mobile-sidebar'
import { Button } from '@/components/ui/button'
import { SidebarItemType } from '@/types/sidebar'

interface SidebarProps {
  sidebarItems: SidebarItemType[]
}

const AdminHeader = ({ sidebarItems }: SidebarProps) => (
  <header className='flex h-14 items-center gap-4 border-b-2 border-customBorder px-4 lg:h-[60px] lg:px-6 justify-between'>
    <MobileSidebar sidebarItems={sidebarItems} />
    <div className='w-full flex-1 rounded-custom hidden lg:flex'></div>
    <Image
      alt='Customer Support'
      loading='lazy'
      src='/assets/images/home/customer-support.svg'
      width={20}
      height={20}
    />
    <div className='mr-2'>
      <Button variant='default' className='w-full'>
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
  </header>
)

export default AdminHeader
