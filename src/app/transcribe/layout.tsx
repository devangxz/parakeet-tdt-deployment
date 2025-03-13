'use client'
import { ChevronRight, ChevronLeft } from 'lucide-react'
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

  return (
    <TooltipProvider>
      <div className='flex min-h-screen flex-col'>
        <Header />
        <div className='flex flex-1 relative'>
        {/* Sidebar container */}
        <div 
          className={cn(
            'relative hidden md:block',
            'transition-all duration-300 ease-in-out',
            'border-r border-customBorder',
            isExpanded ? 'lg:w-72 md:w-48 bg-background' : 'w-10 bg-background overflow-hidden'
          )} 
        >

          {isExpanded ? <button
            className={cn(
              "absolute right-3 top-5 z-20 p-1 rounded-full hover:bg-accent",
              "transition-opacity duration-300",
              isExpanded ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label="Expand sidebar"
          >
              <ChevronLeft size={16} className="text-primary" />
          </button> : 
            <button 
            className='absolute right-2 top-5 z-20 p-1 rounded-full hover:bg-accent transition-opacity duration-300'
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label='Collapse sidebar'
            >
              <ChevronRight size={16} className="text-primary" />
            </button>
          }
          <aside className={cn('absolute w-full overflow-hidden',
            !isExpanded ? 'w-0 opacity-0 invisible' : 'opacity-100 visible transition-opacity duration-300'
          )}>
            <SidebarNav />
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
