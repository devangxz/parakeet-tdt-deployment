'use client'
import React, { useEffect, useRef } from 'react'

import Header from './header'
import { SidebarNav } from './sidebar'
import AuthenticatedFooter from '@/components/authenticated-footer'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface TranscribeLayoutClientProps {
  children: React.ReactNode
}

export function TranscribeLayoutClient({
  children,
}: TranscribeLayoutClientProps) {
  const sidebarRef = useRef<HTMLDivElement>(null)
  const menuButtonRef = useRef<HTMLDivElement>(null)
  const [isExpanded, setIsExpanded] = React.useState(true)

  React.useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsExpanded(false)
    }
  }, [])

  const toggleSidebar = () => {
    setIsExpanded((prev) => !prev)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only handle click outside in mobile view
      if (
        window.innerWidth < 1024 &&
        isExpanded &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node) &&
        !menuButtonRef.current?.contains(event.target as Node)
      ) {
        setIsExpanded(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isExpanded])

  return (
    <TooltipProvider>
      <div className='flex min-h-screen flex-col'>
        <Header toggleSidebar={toggleSidebar} menuButtonRef={menuButtonRef} />
        <div className='flex flex-1 relative'>
          <div
            ref={sidebarRef}
            className={cn(
              'fixed h-full lg:relative lg:h-auto lg:z-10 border-r border-customBorder bg-background z-50 transition-all duration-300 ease-in-out',
              isExpanded ? 'w-[60vw] lg:w-72' : 'w-0 overflow-hidden'
            )}
          >
            <aside
              className={cn(
                'h-full overflow-hidden transition-opacity duration-300',
                isExpanded ? 'opacity-100 visible' : 'opacity-0 invisible'
              )}
            >
              <SidebarNav setIsExpanded={setIsExpanded} />
            </aside>
          </div>
          <main className='flex-1'>
            <div className='h-full'>{children}</div>
          </main>
        </div>
        <AuthenticatedFooter />
      </div>
    </TooltipProvider>
  )
}
