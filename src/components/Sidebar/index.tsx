'use client'

import { Database, Settings, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useState, useEffect } from 'react'

import { getCreditBalanceAction } from '@/app/actions/credit-balance'
import TeamSwitcher from '@/components/team-switcher'
import { SidebarItemType } from '@/types/sidebar'

interface SidebarProps {
  sidebarItems: SidebarItemType[]
  showTeams?: boolean
  heading?: string
}

const Sidebar = ({
  sidebarItems,
  showTeams = true,
  heading = 'Files',
}: SidebarProps) => {
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

  return (
    <div className='flex-1'>
      <nav className='grid items-start text-md font-medium px-2 lg:px-4 py-4'>
        {showTeams && (
          <div className='pb-5 border-b-2 border-customBorder'>
            <h2 className='mb-2.5 text-lg font-semibold tracking-tight'>Teams</h2>
            <TeamSwitcher />
          </div>
        )}

        <div className='py-3 border-b-2 border-customBorder'>
          <SidebarItems
            sidebarItems={sidebarItems as SidebarItemType[]}
            heading={heading}
            pathname={pathname as string}
          />
        </div>

        <div className='pt-3'>
          <h2 className='mb-2.5 text-lg font-semibold tracking-tight'>More</h2>
          <Link
            href='/settings/credits'
            className={`flex items-center gap-2.5 px-3 pt-1 pb-2 transition-all hover:text-primary`}
          >
            <Database className='h-5 w-5' />
            Credits
            <div className='ml-auto flex items-center' test-id='credit-balance'>
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

export default Sidebar

export type props = {
  sidebarItems: SidebarItemType[]
  heading: string
  pathname: string
}

export function SidebarItems(props: props) {
  const { heading, sidebarItems, pathname } = props
  return (
    <div>
      <h2 className='mb-2.5 text-lg font-semibold tracking-tight'>{heading}</h2>
      {sidebarItems.map((item, index) => {
        const Icon = item.icon
        const isActive = pathname === item.href
        return (
          <Link
            key={index}
            href={item.href}
            className={`flex items-center gap-2.5 rounded-md px-3 py-2 transition-all ${
              isActive ? 'text-primary bg-primary/10' : 'hover:text-primary'
            }`}
          >
            <Icon className='h-5 w-5' />
            {item.name}
            {item.badgeCount !== undefined && (
              <p className='ml-auto flex font-normal mr-1'>{item.badgeCount}</p>
            )}
          </Link>
        )
      })}
    </div>
  )
}
