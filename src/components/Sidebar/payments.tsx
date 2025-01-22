'use client'
import {
  Ban,
  BadgeCheck,
  ReplyAll,
  Database,
  Settings,
  ChevronDown,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useState, useEffect } from 'react'

import { getCreditBalanceAction } from '@/app/actions/credit-balance'
import TeamSwitcher from '@/components/team-switcher'

export function SidebarNav() {
  const pathname = usePathname()
  const [creditsBalance, setCreditsBalance] = useState(0)

  const fetchCreditsBalance = async () => {
    try {
      const response = await getCreditBalanceAction()
      if (response.success && response.creditsBalance) {
        setCreditsBalance(response.creditsBalance)
      }
    } catch (err) {
      console.error('Failed to fetch credits balance:', err)
    }
  }

  useEffect(() => {
    fetchCreditsBalance()
  }, [])

  const sidebarNavItems = [
    {
      title: 'Pending',
      href: '/payments/pending',
      icon: Ban,
    },
    {
      title: 'Paid',
      href: '/payments/paid',
      icon: BadgeCheck,
    },
    {
      title: 'Refunded',
      href: '/payments/refunded',
      icon: ReplyAll,
    },
  ]

  return (
    <div className='flex-1'>
      <nav className='grid items-start text-md font-medium px-2 lg:px-4 pt-4'>
        <div className='pb-5 border-b-2 border-customBorder'>
          <h2 className='mb-2.5 text-lg font-semibold tracking-tight'>Teams</h2>
          <TeamSwitcher />
        </div>

        <div className='py-5 border-b-2 border-customBorder'>
          {sidebarNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 transition-all ${
                  isActive ? 'text-primary bg-primary/10' : 'hover:text-primary'
                }`}
              >
                <Icon className='h-5 w-5' />
                {item.title}
              </Link>
            )
          })}
        </div>

        <div className='pt-3'>
        <h2 className='mb-2.5 text-lg font-semibold tracking-tight'>More</h2>
        <Link
            href='/settings/credits'
            className={`flex items-center gap-2.5 px-3 pt-1 pb-2 transition-all hover:text-primary`}
          >
            <Database className='h-5 w-5' />
            Credits
            <div className='ml-auto flex items-center'>
              <p className='font-normal mr-1'>${creditsBalance}</p>
              <ChevronDown className='h-5 w-5 -rotate-90 font-normal' />
            </div>
          </Link>
          <Link
            href='/settings/personal-info'
            className={`flex items-center gap-2.5 px-3 py-1.5 transition-all hover:text-primary`}
          >
            <Settings className='h-5 w-5' />
            Settings
            <ChevronDown className='h-5 w-5 ml-auto flex -rotate-90 font-normal' />
          </Link>
        </div>
      </nav>
    </div>
  )
}
