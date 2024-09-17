import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth/next'

import Form from './form'

export default async function ResetPasswordPage() {
  const session = await getServerSession()
  if (session) {
    redirect('/files')
  }
  return <Form />
}
