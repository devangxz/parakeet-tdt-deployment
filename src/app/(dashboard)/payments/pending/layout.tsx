import { Metadata } from 'next'

import AuthenticatedFooter from '@/components/authenticated-footer'
import PaymentsNavbar from '@/components/navbar/payments'
import { SidebarNav } from '@/components/Sidebar/payments'

export const metadata: Metadata = {
  title: 'Invoices',
  description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
}

interface PaymentsLayoutProps {
  children: React.ReactNode
}

export default function PaymentsLayout({ children }: PaymentsLayoutProps) {
  return (
    <div className='flex min-h-screen flex-col'>
      <PaymentsNavbar />
      <div className='space-y-0.5 border-b-2 border-customBorder px-2 lg:px-4 pt-3 pb-4'>
        <h1 className='text-2xl font-bold'>Payments</h1>
        <p className='text-gray-700'>Manage your payments</p>
      </div>
      <div className='flex flex-1'>
        <div className='hidden border-r-2 border-customBorder md:block md:w-[220px] lg:w-[280px]'>
          <aside className='sticky top-[69.5px]'>
            <SidebarNav />
          </aside>
        </div>
        <main className='flex-1'>
          <div className='h-full bg-muted/40'>{children}</div>
        </main>
      </div>
      <AuthenticatedFooter />
    </div>
  )
}
