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
      name: 'In progress',
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
      name: 'Shared with me',
      icon: Share2,
      isActive: false,
    },
  ]
  return (
    <>
      <PaymentsNavbar />
      <div className='grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]'>
        <div className='hidden border-r-2 border-customBorder md:block'>
          <div className='flex h-full max-h-screen flex-col gap-2'>
            <Sidebar sidebarItems={sidebarItems} />
          </div>
        </div>
        <div className='flex flex-col'>{children}</div>
      </div>
      <AuthenticatedFooter />
    </>
  )
}
