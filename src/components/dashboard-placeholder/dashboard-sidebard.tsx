'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import TeamSwitcher from '@/components/team-switcher'
import { Separator } from '@/components/ui/separator'

export type DashboardSideBarItemType = {
  title: string
  href: string
  icon: React.ElementType
}

type DashboardSideBarProps = {
  sidebarItems: DashboardSideBarItemType[]
}

export function DashboardSideBar(props: DashboardSideBarProps) {
  const pathname = usePathname()
  const { sidebarItems } = props
  return (
    <nav className='flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1 font-medium'>
      <div className=''>
        <h2 className='mb-2 text-lg font-semibold tracking-tight'>Teams</h2>
        <div className='mt-2 mb-6'>
          <TeamSwitcher />
        </div>
        <Separator className='mb-6' />
      </div>
      {sidebarItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 transition-all ${
              isActive ? 'text-primary bg-primary/10' : 'hover:text-primary'
            }`}
          >
            <Icon className='h-5 w-5' />
            {item.title}
          </Link>
        )
      })}
    </nav>
  )
}
