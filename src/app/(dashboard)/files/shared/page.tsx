/* eslint-disable @typescript-eslint/no-explicit-any */
import { getServerSession } from 'next-auth/next'

import List from './list'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import { getSharedFiles } from '@/services/file-service/get-files'

export default async function ArchivedFilesPage() {
  const session = await getServerSession(authOptions)
  const user = session?.user
  const userId = user?.internalTeamUserId || (user?.userId as number)
  const response = await getSharedFiles(userId)

  return (
    <>
      <List files={response.data || []} />
    </>
  )
}
