import React, { ReactElement } from 'react'

import SingupForm from './page'
import Footer from '@/components/footer'
import Navbar from '@/components/navbar'

const RegisterLayout = (): ReactElement => (
  <div>
    <Navbar />
    <SingupForm />
    <Footer />
  </div>
)
export default RegisterLayout
