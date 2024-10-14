import { getServerSession } from 'next-auth/next'

import Options from './options'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import getDefaultOptions from '@/services/user-service/get-order-options'

export default async function OrderOptionsPage() {
  const session = await getServerSession(authOptions)
  const user = session?.user
  const userId = user?.internalTeamUserId || user?.userId
  const response = await getDefaultOptions(userId as number)

  return (
    <>
      <Options options={response} />
    </>
  )
}
