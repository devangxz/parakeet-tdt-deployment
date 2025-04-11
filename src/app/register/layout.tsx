import { Metadata } from 'next'
import React, { ReactElement } from 'react'

import SingupForm from './page'
import Footer from '@/components/footer'
import Navbar from '@/components/navbar'

export const metadata: Metadata = {
  title: 'Create a Scribie Account | Try out our Transcription Services',
  description: 'Create a Scribie Account | Try out our Transcription Services',
}

const RegisterLayout = (): ReactElement => (
  <div>
    <Navbar />
    <SingupForm />
    <Footer />
  </div>
)
export default RegisterLayout
