import React, { ReactElement } from 'react'

import JoinTeamForm from './page'
import Footer from '@/components/footer'
import Navbar from '@/components/navbar'

const RegisterLayout = (): ReactElement => (
  <div>
    <Navbar />
    <JoinTeamForm />
    <Footer />
  </div>
)
export default RegisterLayout
