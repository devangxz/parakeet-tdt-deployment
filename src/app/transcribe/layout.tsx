'use client'
import React from 'react'

import Header from './components/header'
import { SidebarNav } from './components/sidebar'
// import { TermsAndConditionsModal } from './components/terms-modal'
// import { checkSignOffStatus } from '@/app/actions/transcriber/accept-terms'
import AuthenticatedFooter from '@/components/authenticated-footer'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export default function TranscribeLayout({
  children,
}: {
  children: React.ReactNode
}) {

  const [isExpanded, setIsExpanded] = React.useState(true) // Default to expanded

  React.useEffect(() => {
    if(window.innerWidth < 1024) {
      setIsExpanded(false)
    }
  }, [])

  return (
    <TooltipProvider>
      <div className='flex min-h-screen flex-col'>
        <Header setIsExpanded={setIsExpanded} isExpanded={isExpanded}/>
        <div className='flex flex-1 relative'>
        {/* Sidebar container */}
        <div 
           className={cn(
            "absolute left-0 top-0 h-full lg:relative lg:h-auto lg:z-10 border-r border-customBorder bg-background z-50 transition-all duration-300 ease-in-out",
            isExpanded ? "w-[60vw] lg:w-72" : "w-0 overflow-hidden"
          )} 
        >
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
        {/* <TermsAndConditionsModal open={!hasAcceptedTerms} /> */}
      </div>
    </TooltipProvider>
  )
}
