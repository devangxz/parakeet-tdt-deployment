/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Suspense, useEffect } from 'react'

function GoogleAnalyticsHandlerContent() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: session } = useSession()

  useEffect(() => {
    const paramsString = searchParams?.toString() ?? ''
    const pagePath = paramsString
      ? `${pathname ?? ''}?${paramsString}`
      : pathname ?? ''
    const gtag = (window as any).gtag
    if (typeof gtag === 'function') {
      gtag('config', 'G-P369LKS7ND', { page_path: pagePath })
      const userId =
        session && session.user
          ? `${session.user.userId}_${
              session.user.role === 'CUSTOMER' ? 'cu' : 'tr'
            }`
          : 'public'
      gtag('config', 'G-P369LKS7ND', { user_id: userId })
    }
  }, [pathname, searchParams, session])

  return null
}

export default function GoogleAnalyticsHandler() {
  return (
    <Suspense fallback={null}>
      <GoogleAnalyticsHandlerContent />
    </Suspense>
  )
}
