'use client'

import {
  Users,
  User,
  Key,
  ShoppingBasket,
  Banknote,
  Database,
  UserMinus,
  SlidersHorizontal,
  BanknoteIcon,
  CodeXml,
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import React, { useEffect, useRef } from 'react'

import DashboardPlaceholder from '@/components/dashboard-placeholder'
import { DashboardSideBarItemType } from '@/components/dashboard-placeholder/dashboard-sidebard'

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session } = useSession()
  const sidebarRef = useRef<HTMLDivElement>(null)
  const menuButtonRef = useRef<HTMLDivElement>(null)
  const sidebarItems: DashboardSideBarItemType[] = []
  const [isExpanded, setIsExpanded] = React.useState(true)
  if (session?.user?.internalTeamUserId) {
    sidebarItems.push(
      {
        href: '/settings/order-options',
        title: 'Order Options',
        icon: ShoppingBasket,
      },
      {
        href: '/settings/payment-methods',
        title: 'Payment Method',
        icon: Banknote,
      },
      {
        href: '/settings/credits',
        title: 'Credits',
        icon: Database,
      },
      {
        href: '/settings/teams',
        title: 'Teams',
        icon: Users,
      },
      {
        href: '/settings/preferences',
        title: 'Preferences',
        icon: SlidersHorizontal,
      }
    )
  } else {
    if (session?.user?.role === 'CUSTOMER' || session?.user?.role === 'ADMIN') {
      sidebarItems.push(
        {
          href: '/settings/personal-info',
          title: 'Personal Info',
          icon: User,
        },
        {
          href: '/settings/password',
          title: 'Password',
          icon: Key,
        },
        {
          href: '/settings/order-options',
          title: 'Order Options',
          icon: ShoppingBasket,
        },
        {
          href: '/settings/payment-methods',
          title: 'Payment Method',
          icon: Banknote,
        },
        {
          href: '/settings/credits',
          title: 'Credits',
          icon: Database,
        },
        {
          href: '/settings/teams',
          title: 'Teams',
          icon: Users,
        },
        {
          href: '/settings/preferences',
          title: 'Preferences',
          icon: SlidersHorizontal,
        },
        {
          href: '/settings/rest-api',
          title: 'REST API',
          icon: CodeXml,
        },
        {
          href: '/settings/delete',
          title: 'Delete Account',
          icon: UserMinus,
        }
      )
    } else {
      sidebarItems.push(
        {
          href: '/settings/personal-info',
          title: 'Personal Info',
          icon: User,
        },
        {
          href: '/settings/password',
          title: 'Password',
          icon: Key,
        },
        {
          href: '/settings/preferences',
          title: 'Preferences',
          icon: SlidersHorizontal,
        },
        {
          href: '/settings/delete',
          title: 'Delete Account',
          icon: UserMinus,
        },
        {
          href: '/settings/paypal-account',
          title: 'PayPal Account',
          icon: BanknoteIcon,
        }
      )
    }
  }

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
      <DashboardPlaceholder
        sidebarItems={sidebarItems}
        title='Settings'
        subtitle='Manage your account settings'
        setIsExpanded={setIsExpanded}
        isExpanded={isExpanded}
        toggleSidebar={toggleSidebar}
        menuButtonRef={menuButtonRef}
        sidebarRef={sidebarRef}
      >
        {children}
      </DashboardPlaceholder>
    </>
  )
}
