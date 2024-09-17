'use client';
import { useSession } from 'next-auth/react'

import BrevoChatWidget from '@/components/chat-widget'
import { TooltipProvider } from '@/components/ui/tooltip'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session } = useSession()
  return (
    <>
      <TooltipProvider>{children}{(session?.user === undefined || session?.user?.role == 'CUSTOMER') && (
        <BrevoChatWidget />
      )}</TooltipProvider>
    </>
  )
}
