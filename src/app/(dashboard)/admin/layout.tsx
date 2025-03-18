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
import React, { useEffect, useRef } from 'react'

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
  const sidebarRef = useRef<HTMLDivElement>(null)
  const menuButtonRef = useRef<HTMLDivElement>(null)
  const [isExpanded, setIsExpanded] = React.useState(true) // Default to expanded

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

  React.useEffect(() => {
    if(window.innerWidth < 1024) {
      setIsExpanded(false)
    }
  }, [])

  const toggleSidebar = () => {
    setIsExpanded(prev => !prev)
  }
 
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only handle click outside in mobile view
      if (window.innerWidth < 1024 && 
          isExpanded && 
          sidebarRef.current && 
          !sidebarRef.current.contains(event.target as Node) &&
          !menuButtonRef.current?.contains(event.target as Node)) {
        setIsExpanded(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isExpanded])

  return (
    <>
      <PaymentsNavbar toggleSidebar={toggleSidebar} menuButtonRef={menuButtonRef}/>
      <div className={cn(
        'grid min-h-screen w-full relative',
        'grid-cols-[1fr] lg:grid-cols-[auto_1fr]', // Fixed grid layout that doesn't change
        'transition-all duration-300 ease-in-out'
      )}>
        <div 
          ref={sidebarRef}
          className={cn(
            'fixed lg:relative block bg-background z-50 lg:z-10',
            'transition-all duration-300 ease-in-out',
            'border-r border-customBorder',
            isExpanded ? 'w-[60vw] lg:w-72' : 'w-0 overflow-hidden'
          )} 
        >
          <div className={cn('flex h-screen flex-col', isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full')}>
            {session ? (
              <Sidebar
                sidebarItems={
                  isOnlyRevenueDashboardEmail
                    ? onlyRevenueDashboardItems
                    : displayedSidebarItems
                }
                showTeams={false}
                heading='Dashboards'
                setIsExpanded={setIsExpanded}
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
