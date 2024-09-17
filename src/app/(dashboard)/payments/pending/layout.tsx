import { Metadata } from 'next'

import AuthenticatedFooter from '@/components/authenticated-footer'
import PaymentsNavbar from '@/components/navbar/payments'
import { SidebarNav } from '@/components/Sidebar/payments'
import { Separator } from '@/components/ui/separator'

export const metadata: Metadata = {
  title: 'Invoices',
  description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
}

interface PaymentsLayoutProps {
  children: React.ReactNode
}

export default function PaymentsLayout({ children }: PaymentsLayoutProps) {
  return (
    <>
      <PaymentsNavbar />
      <div className='w-[100%] min-h-screen m-auto my-8 px-2 lg:px-4'>
        <div className='space-y-0.5'>
          <h2 className='text-2xl font-bold tracking-tight'>Payments</h2>
          <p className='text-muted-foreground'>Manage your payments</p>
        </div>
        <Separator className='my-6' />
        <div className='flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0'>
          <aside className='lg:w-[250px]'>
            <SidebarNav />
          </aside>
          <div className='flex-1'>{children}</div>
        </div>
      </div>
      <AuthenticatedFooter />
    </>
  )
}
