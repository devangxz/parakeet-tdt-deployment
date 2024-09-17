'use client'
import {
  ListChecks,
  Ban,
  Clock3,
  Verified,
  Users,
  PackageMinus,
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
      href: '/admin/dashboard',
      name: 'Dashboard',
      icon: ListChecks,
      isActive: true,
    },
    {
      href: '/admin/user-info',
      name: 'User Info',
      icon: Ban,
      isActive: false,
    },
    {
      href: '/admin/invoice',
      name: 'Invoice',
      icon: Clock3,
      isActive: false,
    },
    {
      href: '/admin/refunds',
      name: 'Refunds',
      icon: Verified,
      isActive: false,
    },
    {
      href: '/admin/withdraws',
      name: 'Withdraws',
      icon: Users,
      isActive: false,
    },
    {
      href: '/admin/orders',
      name: 'Orders',
      icon: PackageMinus,
      isActive: false,
    },
  ]
  return (
    <>
      <PaymentsNavbar />
      <div className='grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]'>
        <div className='hidden border-r-2 border-customBorder md:block'>
          <div className='flex h-full max-h-screen flex-col gap-2'>
            <Sidebar
              sidebarItems={sidebarItems}
              showTeams={false}
              heading='Dashboards'
            />
          </div>
        </div>
        <div className='flex flex-col overflow-y-auto'>{children}</div>
      </div>
      <AuthenticatedFooter />
    </>
  )
}
