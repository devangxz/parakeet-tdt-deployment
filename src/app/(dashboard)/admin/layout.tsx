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
  Pin,
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
  const [isPinned, setIsPinned] = React.useState(true) // Default to collapsed
  const [isHovered, setIsHovered] = React.useState(false)
  const isExpanded = isPinned || isHovered
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
      <div className={cn(
        'grid min-h-screen w-full relative',
        'grid-cols-[auto_1fr]', // Fixed grid layout that doesn't change
        'transition-all duration-300 ease-in-out'
      )}>
        <div 
          className={cn(
            'relative hidden md:block',
            'transition-all duration-300 ease-in-out',
            'border-r border-customBorder',
            isExpanded ? 'lg:w-72 md:w-48 bg-background' : 'w-2 bg-primary overflow-hidden'
          )} 
          onMouseEnter={() => setIsHovered(true)} 
          onMouseLeave={() => setIsHovered(false)}
        >
          <button
            className={cn(
              "absolute right-3 top-7 z-20 p-1 rounded-full hover:bg-accent",
              "transition-opacity duration-300",
              isExpanded ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            onClick={() => setIsPinned(!isPinned)}
            aria-label={isPinned ? "Unpin sidebar" : "Pin sidebar"}
          >
            {isPinned ? (
              <PackageMinus size={16} className="text-primary" />
            ) : (
              <Pin size={16} className="text-primary" />
            )}
          </button>

          <div className='flex h-screen flex-col gap-2'>
            {session ? (
              <Sidebar
                sidebarItems={
                  isOnlyRevenueDashboardEmail
                    ? onlyRevenueDashboardItems
                    : displayedSidebarItems
                }
                showTeams={false}
                heading='Dashboards'
            />
            ) : (
              <div className='flex h-full items-center justify-center'>
                <Loader2 className='animate-spin text-gray-500' size={24} />
              </div>
            )}
          </div>
        </div>
        <div className='flex flex-col w-full overflow-y-auto'>{children}</div>
      </div>
      <AuthenticatedFooter />
    </>
  )
}
