import React from 'react'

import ResetPassword from './page'
import Footer from '@/components/footer'
import Navbar from '@/components/navbar'

export default function SigninLayout() {
  return (
    <>
      <Navbar />
      <ResetPassword />
      <Footer />
    </>
  )
}
