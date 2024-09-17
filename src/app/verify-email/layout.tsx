import React from 'react'

import VerifyEmail from './page'
import Footer from '@/components/footer'
import Navbar from '@/components/navbar'

export default function SigninLayout() {
  return (
    <>
      <Navbar />
      <VerifyEmail />
      <Footer />
    </>
  )
}
