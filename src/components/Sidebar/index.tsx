'use client'
import axios from 'axios'
import { Database, Settings, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useState, useEffect } from 'react'

import TeamSwitcher from '@/components/team-switcher'
import { Separator } from '@/components/ui/separator'
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
      const response = await axios.get(`/api/credit-balance`)
      setCreditsBalance(response.data.creditsBalance)
    } catch (err) {
      console.error('Failed to fetch credits balance:', err)
    }
  }

  useEffect(() => {
    fetchCreditsBalance()
  }, [])

  return (
    <div className='flex-1'>
      <nav className='grid items-start px-2 text-md font-medium lg:px-4'>
        {showTeams && (
          <>
            <h2 className='mb-2 text-lg font-semibold tracking-tight mt-3'>
              Teams
            </h2>
            <div className='mt-2 mb-8'>
              <TeamSwitcher />
            </div>
            <Separator className='mb-6' />
          </>
        )}

        {!showTeams && <div className='mt-3' />}

        <SidebarItems
          sidebarItems={sidebarItems as SidebarItemType[]}
          heading={heading}
          pathname={pathname as string}
        />
        <Separator className='mb-6 mt-6 p-0' />
        <h2 className='mb-2 text-lg font-semibold tracking-tight'>More</h2>
        <Link
          href='/settings/credits'
          className={`flex items-center gap-2.5 rounded-lg px-3 py-2 transition-all hover:text-primary`}
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
          className={`flex items-center gap-2.5 rounded-lg px-3 py-2 transition-all hover:text-primary`}
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

export type props = {
  sidebarItems: SidebarItemType[]
  heading: string
  pathname: string
}

export function SidebarItems(props: props) {
  const { heading, sidebarItems, pathname } = props
  return (
    <>
      <h2 className='mb-2 text-lg font-semibold tracking-tight'>{heading}</h2>
      {sidebarItems.map((item, index) => {
        const Icon = item.icon
        const isActive = pathname === item.href
        return (
          <Link
            key={index}
            href={item.href}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 transition-all ${
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
    </>
  )
}
