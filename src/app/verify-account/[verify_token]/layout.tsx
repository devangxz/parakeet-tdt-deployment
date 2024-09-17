import React from 'react'

import VerifyAccount from './page'
import Footer from '@/components/footer'
import Navbar from '@/components/navbar'

export default function SigninLayout() {
  return (
    <>
      <Navbar />
      <VerifyAccount />
      <Footer />
    </>
  )
}
