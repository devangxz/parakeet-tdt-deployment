import { getServerSession } from 'next-auth/next'

import ApiKey from './api-key'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import getRestApi from '@/services/user-service/get-rest-api'

export default async function OrderOptionsPage() {
  const session = await getServerSession(authOptions)
  const user = session?.user
  const userId = user?.internalTeamUserId || user?.userId
  const response = await getRestApi(userId as number)

  return (
    <>
      <ApiKey apiKeys={response} />
    </>
  )
}
