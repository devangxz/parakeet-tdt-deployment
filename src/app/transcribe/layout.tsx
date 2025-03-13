'use client'
import { PackageMinus, Pin } from 'lucide-react'
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

  const [isPinned, setIsPinned] = React.useState(true) // Default to collapsed
  const [isHovered, setIsHovered] = React.useState(false)
  const isExpanded = isPinned || isHovered

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
            isExpanded ? 'lg:w-72 md:w-48 bg-background' : 'w-2 bg-primary overflow-hidden'
          )} 
          onMouseEnter={() => setIsHovered(true)} 
          onMouseLeave={() => setIsHovered(false)}
        >
          <button
            className={cn(
              "absolute right-3 top-5 z-20 p-1 rounded-full hover:bg-accent",
              "transition-opacity duration-300",
              isExpanded ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            onClick={() => setIsPinned(!isPinned)}
            aria-label={isPinned ? "Unpin sidebar" : "Pin sidebar"}
          >
            {isPinned ? (
              <PackageMinus size={16} className="text-primary" />
            ) : (
              <Pin size={16} className="text-primary" />
            )}
          </button>
          <aside className={cn('absolute w-full overflow-hidden',
            !isExpanded ? 'w-0 opacity-0 invisible' : 'opacity-100 visible transition-opacity duration-300'
          )}>
            <SidebarNav />
          </aside>

            {!isExpanded && (
          <div 
            className="fixed top-0 bottom-0 left-0 w-4 z-10 cursor-pointer md:block hidden"
            onMouseEnter={() => setIsHovered(true)}
            aria-label="Expand sidebar"
            />
          )}
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
