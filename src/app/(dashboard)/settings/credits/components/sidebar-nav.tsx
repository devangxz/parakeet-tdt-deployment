'use client'
import { Ban, BadgeCheck, ReplyAll } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function SidebarNav() {
  const pathname = usePathname()

  const sidebarNavItems = [
    {
      title: 'Pending',
      href: '/payments/pending',
      icon: Ban,
    },
    {
      title: 'Paid',
      href: '/payments/paid',
      icon: BadgeCheck,
    },
    {
      title: 'Refunded',
      href: '/payments/refunded',
      icon: ReplyAll,
    },
  ]

  return (
    <nav className='flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1 font-medium'>
      {sidebarNavItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
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
