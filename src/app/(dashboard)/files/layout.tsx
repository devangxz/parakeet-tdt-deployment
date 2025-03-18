'use client'

import {
  ListChecks,
  Clock3,
  Verified,
  PackageMinus,
  FileUp,
  Share2,
  File,
} from 'lucide-react'
import { usePathname } from 'next/navigation'
import React from 'react'

import AuthenticatedFooter from '@/components/authenticated-footer'
import PaymentsNavbar from '@/components/navbar/payments'
import Sidebar from '@/components/Sidebar'
import { cn } from '@/lib/utils'
import { SidebarItemType } from '@/types/sidebar'

export default function FilesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  
  const [isExpanded, setIsExpanded] = React.useState(true) // Default to 
  const sidebarItems: SidebarItemType[] = [
    {
      href: '/files/upload',
      name: 'Upload',
      icon: FileUp,
      isActive: true,
    },
    {
      href: '/files/in-progress',
      name: 'In Progress',
      icon: Clock3,
      isActive: false,
    },
    {
      href: '/files/delivered',
      name: 'Delivered',
      icon: Verified,
      isActive: false,
    },
    {
      href: '/files/archived',
      name: 'Archived',
      icon: PackageMinus,
      isActive: false,
    },
    {
      href: '/files/all-files',
      name: 'All',
      icon: ListChecks,
      isActive: false,
    },
    {
      href: '/files/shared',
      name: 'Shared With Me',
      icon: Share2,
      isActive: false,
    },
  ]

  if (pathname?.startsWith('/files/permalink/')) {
    sidebarItems.push({
      href: pathname,
      name: 'Permalink',
      icon: File,
      isActive: true,
    })
  }

  React.useEffect(() => {
    if(window.innerWidth < 1024) {
      setIsExpanded(false)
    }
  }, [])

  return (
    <div className='flex min-h-screen flex-col'>
      <PaymentsNavbar setIsExpanded={setIsExpanded} isExpanded={isExpanded}/>
      <div className='flex flex-1 relative'>
        {/* Sidebar container */}
        <div 
          className={cn(
            'absolute left-0 top-0 lg:relative h-full block',
            'transition-all duration-300 ease-in-out',
            'border-r border-customBorder bg-background z-50',
            isExpanded ? 'w-[60vw] lg:w-72' : 'w-0 overflow-hidden'
          )} 
        > 
          <aside className={cn(
            'h-full transition-all duration-300 ease-in-out',
            isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full'
          )}>
            <Sidebar sidebarItems={sidebarItems} setIsExpanded={setIsExpanded} />
          </aside>
        </div>

        <main className="flex-1">
          <div className='h-full'>{children}</div>
        </main>
      </div>
      <AuthenticatedFooter />
    </div>
  )
}
