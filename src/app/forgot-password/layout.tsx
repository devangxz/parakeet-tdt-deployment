import React from 'react'

import ForgotPassword from './page'
import Footer from '@/components/footer'
import Navbar from '@/components/navbar'

export default function SigninLayout() {
  return (
    <>
      <Navbar />
      <ForgotPassword />
      <Footer />
    </>
  )
}
