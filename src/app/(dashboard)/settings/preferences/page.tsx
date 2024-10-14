import { getServerSession } from 'next-auth/next'

import Options, { PreferencesResponse } from './component'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import { getDefaultPreferences } from '@/services/user-service/get-user-preferences'

export default async function OrderOptionsPage() {
  const session = await getServerSession(authOptions)
  const user = session?.user
  const userId = user?.internalTeamUserId || user?.userId
  const response = await getDefaultPreferences(
    userId as number,
    user?.role ?? ''
  )

  return (
    <>
      <Options data={response as PreferencesResponse} />
    </>
  )
}
