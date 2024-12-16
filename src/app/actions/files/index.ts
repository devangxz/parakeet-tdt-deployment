'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import { getFilesByStatus } from '@/services/file-service/get-files'

export async function refetchFiles(status: string) {
  const session = await getServerSession(authOptions)
  const user = session?.user

  if (!user) {
    return []
  }

  const response = await getFilesByStatus(
    status,
    user?.userId as number,
    user?.internalTeamUserId as number | null
  )

  return response?.success ? response.data : []
}
