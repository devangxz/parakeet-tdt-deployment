'use client'
import { Settings, ChevronDown, DollarSign, Star } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

import { Earnings } from '@/types/earnings'

export interface SidebarItemType {
  href: string
  name: string
  badgeCount?: number
  isActive: boolean
}

interface SidebarProps {
  sidebarItems: SidebarItemType[]
  earnings: Earnings | null
}

const Sidebar = ({ sidebarItems, earnings }: SidebarProps) => {
  const pathname = usePathname()
  return (
    <div className='flex-1'>
      <nav className='grid items-start px-2 text-md font-medium lg:px-4 mt-4'>
        <h2 className='mb-2 text-lg font-semibold tracking-tight'>Dashboard</h2>
        {sidebarItems.map((item, index) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={index}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
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
        <h2 className='mb-2 text-lg font-semibold tracking-tight mt-10'>
          Statistics
        </h2>
        <Link
          href='/transcribe/earnings'
          className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-all ${
            pathname === '/transcribe/earnings'
              ? 'text-primary bg-primary/10'
              : 'hover:text-primary'
          }`}
        >
          <DollarSign className='h-5 w-5' />
          Balance Earnings
          <div className='ml-auto flex items-center'>
            <p className='font-normal mr-1'>
              ${earnings?.CURRENT_BALANCE?.toFixed(2)}
            </p>
          </div>
        </Link>
        {/* <div
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all`}
                >
                    <Star className='h-5 w-5' />
                    Grade
                    <div className='ml-auto flex items-center'>
                        <p className='font-normal mr-1'>3.5</p>
                    </div>
                </div> */}
        <div>
          <div
            className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-all`}
          >
            <Star className='h-5 w-5' />
            Submitted today
            <div className='ml-auto flex items-center'>
              <p className='font-normal mr-1'>
                {earnings?.TODAY_CREDITED_HOURS?.toFixed(2)}
              </p>
            </div>
          </div>
          <p style={{ fontSize: '12px', marginLeft: '13px' }}>
            Get a $5 bonus by submitting 4 hours by 2:30PM EDT (US).
          </p>
        </div>

        <h2 className='mb-2 text-lg font-semibold tracking-tight mt-10'>
          More
        </h2>
        <Link
          href='/transcribe-guide'
          className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary`}
        >
          <DollarSign className='h-5 w-5' />
          Guides
          <div className='ml-auto flex items-center'>
            <ChevronDown className='h-5 w-5 -rotate-90 font-normal' />
          </div>
        </Link>
        <Link
          href='/settings/personal-info'
          className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary`}
        >
          <Settings className='h-5 w-5' />
          Settings
          <ChevronDown className='h-5 w-5 ml-auto flex -rotate-90 font-normal' />
        </Link>
      </nav>
    </div>
  )
}

export default Sidebar
