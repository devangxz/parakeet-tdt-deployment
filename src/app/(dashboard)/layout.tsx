'use client';
import { GoogleOAuthProvider } from '@react-oauth/google';
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
      <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''}>
        <TooltipProvider>{children}{(session?.user === undefined || session?.user?.role == 'CUSTOMER') && (
          <BrevoChatWidget />
        )}</TooltipProvider>
      </GoogleOAuthProvider>
    </>
  )
}
