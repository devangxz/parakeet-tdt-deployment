import { Menu, Database, Settings, ChevronDown } from 'lucide-react'
import NextImage from 'next/image'
import Link from 'next/link'
import React from 'react'

import TeamSwitcher from '@/components/team-switcher'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { SidebarItemType } from '@/types/sidebar'

interface SidebarProps {
  sidebarItems: SidebarItemType[]
}

const MobileSidebar = ({ sidebarItems }: SidebarProps) => (
  <Sheet>
    <SheetTrigger asChild>
      <Button variant='outline' size='icon' className='shrink-0 md:hidden'>
        <Menu className='h-5 w-5' />
        <span className='sr-only'>Scribie</span>
      </Button>
    </SheetTrigger>
    <SheetContent side='left' className='flex flex-col'>
      <nav className='grid gap-2 text-sm font-medium'>
        <Link
          href='#'
          className='flex items-center gap-2 text-lg font-semibold mb-4'
        >
          <NextImage
            src='/assets/images/logo.svg'
            alt='scribie'
            width={30}
            height={30}
          />
          <span className=''>Scribie</span>
        </Link>
        <h2 className='mb-2 text-lg font-semibold tracking-tight mt-2'>
          Teams
        </h2>
        <div className='mb-5'>
          <TeamSwitcher />
        </div>
        <h2 className='mb-2 text-lg font-semibold tracking-tight'>Files</h2>
        {sidebarItems.map((item, index) => {
          const Icon = item.icon
          return (
            <Link
              key={index}
              href={item.href}
              className={`flex items-center gap-4 rounded-xl px-3 py-2 ${
                item.isActive
                  ? 'text-primary bg-primary/10'
                  : ' hover:text-foreground'
              }`}
            >
              <Icon className='h-4 w-4' />
              {item.name}
              {item.badgeCount !== undefined && (
                <p className='ml-auto flex font-normal mr-4'>
                  {item.badgeCount}
                </p>
              )}
            </Link>
          )
        })}
      </nav>
      <h2 className='text-lg font-semibold tracking-tight mt-5'>More</h2>
      <Link
        href='/settings'
        className={`flex items-center gap-4 rounded-xl px-3 hover:text-foreground text-sm font-medium`}
      >
        <Database className='h-4 w-4' />
        Credits
        <div className='ml-auto flex items-center'>
          <p className='font-normal mr-1'>$450</p>
          <ChevronDown className='h-4 w-4 -rotate-90 font-normal' />
        </div>
      </Link>
      <Link
        href='/settings'
        className={`flex items-center gap-4 rounded-xl px-3 hover:text-foreground text-sm font-medium`}
      >
        <Settings className='h-4 w-4' />
        Settings
        <ChevronDown className='h-4 w-4 ml-auto flex -rotate-90 font-normal' />
      </Link>
      <Link
        href='/settings'
        className={`flex items-center gap-4 rounded-xl px-3 hover:text-foreground text-sm font-medium`}
      >
        <Settings className='h-4 w-4' />
        Live Chat
        <ChevronDown className='h-4 w-4 ml-auto flex -rotate-90 font-normal' />
      </Link>
    </SheetContent>
  </Sheet>
)

export default MobileSidebar
