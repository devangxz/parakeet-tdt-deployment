'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import TeamSwitcher from '@/components/team-switcher'

export type DashboardSideBarItemType = {
  title: string
  href: string
  icon: React.ElementType
}

type DashboardSideBarProps = {
  sidebarItems: DashboardSideBarItemType[]
  setIsExpanded: (isExpanded: boolean) => void
}

export function DashboardSideBar(props: DashboardSideBarProps) {
  const pathname = usePathname()
  const { sidebarItems, setIsExpanded } = props

  const handleResponsiveCollapse = () => {
    if (window.innerWidth < 1024 && setIsExpanded) {
      setIsExpanded(false);
    }
  };

  return (
    <div className='flex-1'>
      <nav className='grid items-start text-md font-medium px-2 lg:px-4 py-4'>
        <div className='pb-5 border-b-2 border-customBorder truncate'>
          <h2 className='mb-2.5 text-lg font-semibold tracking-tight'>Teams</h2>
          <TeamSwitcher />
        </div>

        <div className='pt-5'>
          {sidebarItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 transition-all ${
                  isActive ? 'text-primary bg-primary/10' : 'hover:text-primary'
                }`}
                onClick={handleResponsiveCollapse}
              >
                <Icon className='h-5 w-5' />
                {item.title}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
