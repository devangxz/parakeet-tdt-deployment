'use client'
import React from 'react'

import AuthenticatedFooter from '@/components/authenticated-footer'
import PaymentsNavbar from '@/components/navbar/payments'
import { SidebarNav } from '@/components/Sidebar/payments'
import { cn } from '@/lib/utils'

interface PaymentsLayoutProps {
  children: React.ReactNode
}

export default function PaymentsLayout({ children }: PaymentsLayoutProps) {
  const [isExpanded, setIsExpanded] = React.useState(true)

  React.useEffect(() => {
    if(window.innerWidth < 1024) {
      setIsExpanded(false)
    }
  }, [])
  
  return (
    <div className='flex min-h-screen flex-col'>
      <PaymentsNavbar setIsExpanded={setIsExpanded} isExpanded={isExpanded}/>
      <div className='space-y-0.5 border-b-2 border-customBorder px-2 lg:px-4 pt-3 pb-4'>
        <h1 className='text-2xl font-bold'>Payments</h1>
        <p className='text-muted-foreground'>Manage your payments</p>
      </div>
      <div className='flex flex-1 relative'>
        <div  className={cn(
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
