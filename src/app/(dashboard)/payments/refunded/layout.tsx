'use client'
import React, { useEffect, useRef, useState } from 'react'

import AuthenticatedFooter from '@/components/authenticated-footer'
import PaymentsNavbar from '@/components/navbar/payments'
import { SidebarNav } from '@/components/Sidebar/payments'
import { cn } from '@/lib/utils'

interface PaymentsLayoutProps {
  children: React.ReactNode
}

export default function PaymentsLayout({ children }: PaymentsLayoutProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  const sidebarRef = useRef<HTMLDivElement>(null)
  const menuButtonRef = useRef<HTMLDivElement>(null)

  const toggleSidebar = () => {
    setIsExpanded(prev => !prev)
  }

  useEffect(() => {
    if(window.innerWidth < 1024) {
      setIsExpanded(false)
    }
  }, [])

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
    <div className='flex min-h-screen flex-col'>
      <PaymentsNavbar toggleSidebar={toggleSidebar} menuButtonRef={menuButtonRef}/>
      <div className='space-y-0.5 border-b-2 border-customBorder px-2 lg:px-4 pt-3 pb-4'>
        <h1 className='text-2xl font-bold'>Payments</h1>
        <p className='text-muted-foreground'>Manage your payments</p>
      </div>
      <div className='flex flex-1 relative'>
        <div  
          ref={sidebarRef}
          className={cn(
            "absolute left-0 top-0 h-full lg:relative lg:h-auto lg:z-10 border-r border-customBorder bg-background z-50 transition-all duration-300 ease-in-out",
            isExpanded ? "w-[60vw] lg:w-72" : "w-0 overflow-hidden"
          )} >
          <aside className={cn(
                "h-full overflow-hidden transition-opacity duration-300",
                isExpanded ? "opacity-100 visible" : "opacity-0 invisible"
              )}>
            <SidebarNav setIsExpanded={setIsExpanded} />
          </aside>
        </div>
        <main className='flex-1'>
          <div className='h-full'>{children}</div>
        </main>
      </div>
      <AuthenticatedFooter />
    </div>
  )
}
