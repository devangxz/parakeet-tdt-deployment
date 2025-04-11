import { Metadata } from 'next'
import React from 'react'

import Signin from './page'
import Footer from '@/components/footer'
import Navbar from '@/components/navbar'

export const metadata: Metadata = {
  title:
    'Sign In to Your Scribie Account | Access Files & Order Transcriptions',
  description:
    'Sign In to Your Scribie Account | Access Files & Order Transcriptions',
}

export default function SigninLayout() {
  return (
    <>
      <Navbar />
      <Signin />
      <Footer />
    </>
  )
}
