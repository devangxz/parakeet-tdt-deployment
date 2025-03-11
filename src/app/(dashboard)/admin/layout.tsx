'use client'
import {
  ListChecks,
  Clock3,
  Verified,
  Users,
  PackageMinus,
  CreditCard,
  Wrench,
  CircleDollarSign,
  Building2,
  Loader2,
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import React from 'react'

import AuthenticatedFooter from '@/components/authenticated-footer'
import PaymentsNavbar from '@/components/navbar/payments'
import Sidebar from '@/components/Sidebar'
import { ONLY_REVENUE_DASHBOARD_EMAILS } from '@/constants'
import { cn } from '@/lib/utils'
import { SidebarItemType } from '@/types/sidebar'

export default function FilesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session } = useSession()
  const [isCollapsed, setIsCollapsed] = React.useState(true)
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

  const fullSidebarItems: SidebarItemType[] = [
    ...sidebarItems,
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
      icon: CreditCard,
      isActive: false,
    },
    {
      href: '/admin/dev',
      name: 'Dev Tools',
      icon: Wrench,
      isActive: false,
    },
    {
      href: '/admin/revenue-dashboard',
      name: 'Revenue Dashboard',
      icon: CircleDollarSign,
      isActive: false,
    },
    {
      href: '/admin/org-dashboard',
      name: 'Org Dashboard',
      icon: Building2,
      isActive: false,
    },
  ]

  const displayedSidebarItems =
    session?.user?.role === 'OM' ? sidebarItems : fullSidebarItems

  const isOnlyRevenueDashboardEmail = ONLY_REVENUE_DASHBOARD_EMAILS.includes(
    session?.user?.email ?? ''
  )

  const onlyRevenueDashboardItems = [
    {
      href: '/admin/revenue-dashboard',
      name: 'Revenue Dashboard',
      icon: CircleDollarSign,
      isActive: false,
    },
  ]

  return (
    <>
      <PaymentsNavbar />
      <div className={cn('grid min-h-screen w-full', isCollapsed ? 'md:grid-cols-[60px_1fr]' : 'md:grid-cols-[220px_1fr]',
         isCollapsed ? 'lg:grid-cols-[90px_1fr]' : 'lg:grid-cols-[280px_1fr]')}>
        <div className='hidden border-r-2 border-customBorder md:block'>
          <div className='flex h-full max-h-screen flex-col gap-2' onClick={() => setIsCollapsed(!isCollapsed)}>
            {session ? (
              <Sidebar
                sidebarItems={
                  isOnlyRevenueDashboardEmail
                    ? onlyRevenueDashboardItems
                    : displayedSidebarItems
                }
                showTeams={false}
                heading='Dashboards'
                isCollapsed={isCollapsed}
            />
            ) : (
              <div className='flex h-full items-center justify-center'>
                <Loader2 className='animate-spin text-gray-500' size={24} />
              </div>
            )}
          </div>
        </div>
        <div className='flex flex-col overflow-y-auto'>{children}</div>
      </div>
      <AuthenticatedFooter />
    </>
  )
}
