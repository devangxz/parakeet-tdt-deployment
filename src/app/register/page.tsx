import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth/next'

import Form from './form'

export default async function SignupPage() {
  const session = await getServerSession()
  if (session) {
    redirect('/files/upload')
  }
  return <Form />
}
