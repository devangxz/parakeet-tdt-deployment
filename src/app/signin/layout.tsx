import React from 'react'

import Signin from './page'
import Footer from '@/components/footer'
import Navbar from '@/components/navbar'

export default function SigninLayout() {
  return (
    <>
      <Navbar />
      <Signin />
      <Footer />
    </>
  )
}
