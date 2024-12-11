import { useSession } from 'next-auth/react'

import Header from './components/header'
import Sidebar, { SidebarItemType } from './components/sidebar'
import { getTranscriberEarnings } from '@/app/actions/transcriber/earnings'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Earnings } from '@/types/earnings'

type AllSidebarItemType = SidebarItemType & {
  type: string
}

export default async function FilesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session } = useSession()
  const earnings = await getTranscriberEarnings()

  const allSidebarItems: AllSidebarItemType[] = [
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

  if (!session?.user?.legalEnabled && session?.user?.reviewEnabled) {
    sidebarItems.push({
      href: '/transcribe/general-cf-reviewer',
      name: 'GT-Finalizer',
      isActive: false,
    })
  }

  if (session?.user?.legalEnabled) {
    sidebarItems.push({
      href: '/transcribe/legal-qc',
      name: 'LT-Editor',
      isActive: false,
    })
  }

  if (session?.user?.legalEnabled && session?.user?.reviewEnabled) {
    sidebarItems.push({
      href: '/transcribe/legal-cf-reviewer',
      name: 'LT-Finalizer',
      isActive: false,
    })
  }

  return (
    <TooltipProvider>
      <Header />
      <div className='grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]'>
        <div className='hidden border-r-2 border-customBorder md:block'>
          <div className='flex h-full max-h-screen flex-col gap-2'>
            <Sidebar
              earnings={earnings.earnings as unknown as Earnings}
              sidebarItems={sidebarItems}
            />
          </div>
        </div>
        <div className='flex flex-col'>{children}</div>
      </div>
    </TooltipProvider>
  )
}
