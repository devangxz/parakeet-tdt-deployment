/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { Settings, ChevronDown, DollarSign, Star } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import React, { useEffect, useState } from 'react'

import { getTranscriberEarnings } from '@/app/actions/transcriber/earnings'

export interface SidebarItemType {
  href: string
  name: string
  badgeCount?: number
  isActive: boolean
  type: string
}

export function SidebarNav() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [earnings, setEarnings] = useState<any>(null)

  const fetchEarnings = async () => {
    try {
      const response = await getTranscriberEarnings()
      if (response.success && response.earnings) {
        setEarnings(response.earnings)
      }
    } catch (err) {
      console.error('Failed to fetch transcriber earnings:', err)
    }
  }

  useEffect(() => {
    fetchEarnings()
  }, [])

  const allSidebarItems: SidebarItemType[] = [
    {
      href: '/transcribe/transcriber',
      name: 'Transcribe',
      isActive: false,
      type: 'transcriber',
    },
    {
      href: '/transcribe/reviewer',
      name: 'Review',
      isActive: false,
      type: 'reviewer',
    },
    {
      href: '/transcribe/proofreader',
      name: 'Proofread',
      isActive: false,
      type: 'proofreader',
    },
    {
      href: '/transcribe/qc',
      name: 'GT-Editor',
      isActive: true,
      type: 'qc',
    },
  ]

  const sidebarItems: SidebarItemType[] = []

  allSidebarItems.forEach((item) => {
    if (session?.user?.role === 'REVIEWER') {
      sidebarItems.push(item)
    }
    if (session?.user?.role === 'QC' && item.type !== 'cf') {
      sidebarItems.push(item)
    }

    if (
      session?.user?.role === 'PROOFREADER' &&
      item.type !== 'cf' &&
      item.type !== 'qc'
    ) {
      sidebarItems.push(item)
    }

    if (
      session?.user?.role === 'TRANSCRIBER_LEVEL_2' &&
      (item.type === 'reviewer' || item.type === 'transcriber')
    ) {
      sidebarItems.push(item)
    }

    if (session?.user?.role === 'TRANSCRIBER' && item.type === 'transcriber') {
      sidebarItems.push(item)
    }
  })

  if (session?.user?.generalFinalizerEnabled) {
    sidebarItems.push({
      href: '/transcribe/general-cf-reviewer',
      name: 'GT-Finalizer',
      isActive: false,
      type: 'cf',
    })
  }

  if (session?.user?.legalEnabled) {
    sidebarItems.push({
      href: '/transcribe/legal-qc',
      name: 'LT-Editor',
      isActive: false,
      type: 'qc',
    })
  }

  if (session?.user?.legalEnabled && session?.user?.reviewEnabled) {
    sidebarItems.push({
      href: '/transcribe/legal-cf-reviewer',
      name: 'LT-Finalizer',
      isActive: false,
      type: 'cf',
    })
  }

  return (
    <div className='flex-1'>
      <nav className='grid items-start text-md font-medium px-2 lg:px-4 py-4'>
        <div className='pb-5 border-b-2 border-customBorder'>
          <h2 className='mb-2.5 text-lg font-semibold tracking-tight'>
            Dashboard
          </h2>
          {sidebarItems.map((item, index) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={index}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 transition-all ${
                  isActive ? 'text-primary bg-primary/10' : 'hover:text-primary'
                }`}
              >
                {item.name}
                {item.badgeCount !== undefined && (
                  <p className='ml-auto flex font-normal mr-1'>
                    {item.badgeCount}
                  </p>
                )}
              </Link>
            )
          })}
        </div>

        <div className='py-3 border-b-2 border-customBorder'>
          <h2 className='mb-2.5 text-lg font-semibold tracking-tight'>
            Statistics
          </h2>
          <Link
            href='/transcribe/earnings'
            className={`flex items-center justify-between gap-2 rounded-md px-3 py-2 transition-all ${
              pathname === '/transcribe/earnings'
                ? 'text-primary bg-primary/10'
                : 'hover:text-primary'
            }`}
          >
            <div className='flex gap-1.5 items-center'>
              <DollarSign className='h-5 w-5' />
              Balance Earnings
            </div>
            <p className='font-normal'>
              ${earnings?.CURRENT_BALANCE?.toFixed(2)}
            </p>
          </Link>
          <div className='flex flex-col gap-y-2 px-3 py-2'>
            <div className='flex items-center justify-between gap-2 rounded-md'>
              <div className='flex gap-1.5 items-center'>
                <Star className='h-5 w-5' />
                <span>Submitted Today</span>
              </div>
              <p className='font-normal'>
                {earnings?.TODAY_CREDITED_HOURS?.toFixed(2)}
              </p>
            </div>
            <p className='text-xs text-muted-foreground'>
              Get a $5 bonus by submitting 4 hours by 2:30PM EDT (US).
            </p>
          </div>
        </div>

        <div className='pt-3'>
          <h2 className='mb-2.5 text-lg font-semibold tracking-tight'>More</h2>
          <Link
            href='/transcriber-guide'
            className={`flex items-center gap-2.5 px-3 pt-1 pb-2 transition-all hover:text-primary`}
          >
            <DollarSign className='h-5 w-5' />
            Guides
            <ChevronDown className='h-5 w-5 ml-auto flex -rotate-90 font-normal' />
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
