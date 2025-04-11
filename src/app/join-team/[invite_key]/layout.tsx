import { Metadata } from 'next'
import React, { ReactElement } from 'react'

import JoinTeamForm from './page'
import Footer from '@/components/footer'
import Navbar from '@/components/navbar'

export const metadata: Metadata = {
  title: 'Careers at Scribie | Transcription, Tech & Business Opportunities',
  description:
    'Careers at Scribie | Transcription, Tech & Business Opportunities',
}

const RegisterLayout = (): ReactElement => (
  <div>
    <Navbar />
    <JoinTeamForm />
    <Footer />
  </div>
)
export default RegisterLayout
