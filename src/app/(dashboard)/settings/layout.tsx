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
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import React from 'react'

import DashboardPlaceholder from '@/components/dashboard-placeholder'
import { DashboardSideBarItemType } from '@/components/dashboard-placeholder/dashboard-sidebard'

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session } = useSession()
  const sidebarItems: DashboardSideBarItemType[] = []

  if (session?.user?.internalTeamUserId) {
    sidebarItems.push(
      {
        href: '/settings/order-options',
        title: 'Order options',
        icon: ShoppingBasket,
      },
      {
        href: '/settings/payment-methods',
        title: 'Payment method',
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
          title: 'Order options',
          icon: ShoppingBasket,
        },
        {
          href: '/settings/payment-methods',
          title: 'Payment method',
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

  return (
    <>
      <DashboardPlaceholder
        sidebarItems={sidebarItems}
        title='Settings'
        subtitle='Manage your account settings'
      >
        {children}
      </DashboardPlaceholder>
    </>
  )
}
