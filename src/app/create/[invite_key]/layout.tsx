import React, { ReactElement } from 'react'

import Create from './page'
import Footer from '@/components/footer'
import Navbar from '@/components/navbar'

interface RegisterLayoutProps {
  params: { invite_key: string }
}

const RegisterLayout = ({ params }: RegisterLayoutProps): ReactElement => (
  <div>
    <Navbar />
    <Create params={params} />
    <Footer />
  </div>
)

export default RegisterLayout
