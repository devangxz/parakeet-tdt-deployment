'use client'

import {
  ListChecks,
  Clock3,
  Verified,
  PackageMinus,
  FileUp,
  Share2,
} from 'lucide-react'
import React from 'react'

import AuthenticatedFooter from '@/components/authenticated-footer'
import PaymentsNavbar from '@/components/navbar/payments'
import Sidebar from '@/components/Sidebar'
import { SidebarItemType } from '@/types/sidebar'

export default function FilesLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
  return (
    <div className='flex min-h-screen flex-col'>
      <PaymentsNavbar />
      <div className='flex flex-1'>
        <div className='hidden border-r-2 border-customBorder md:block md:w-[220px] lg:w-[280px]'>
          <aside className='sticky top-[69.5px]'>
            <Sidebar sidebarItems={sidebarItems} />
          </aside>
        </div>
        <main className='flex-1'>
          <div className='h-full bg-muted/40'>{children}</div>
        </main>
      </div>
      <AuthenticatedFooter />
    </div>
  )
}
