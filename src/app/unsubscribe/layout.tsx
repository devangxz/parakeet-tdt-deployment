import React from 'react'

import Footer from '@/components/footer'
import Navbar from '@/components/navbar'

export default function SigninLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  )
}
