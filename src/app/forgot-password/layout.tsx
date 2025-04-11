import { Metadata } from 'next'
import React from 'react'

import ForgotPassword from './page'
import Footer from '@/components/footer'
import Navbar from '@/components/navbar'

export const metadata: Metadata = {
  title: 'Reset Your Password | Secure Account Recovery | Scribie',
  description: 'Reset Your Password | Secure Account Recovery | Scribie',
}

export default function SigninLayout() {
  return (
    <>
      <Navbar />
      <ForgotPassword />
      <Footer />
    </>
  )
}
