import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth/next'

import Form from './form'

export default async function JoinTeamPage() {
  const session = await getServerSession()
  if (session) {
    redirect('/files')
  }
  return <Form />
}
