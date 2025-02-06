'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import transferFiles from '@/services/file-service/transfer'

export async function transferFilesAction(fileIds: string[], toUserId: number) {
  const session = await getServerSession(authOptions)
  const user = session?.user

  if (!user) {
    return {
      success: false,
      message: 'Unauthorized',
    }
  }

  const fromUserId = user.userId

  const response = await transferFiles(fileIds, fromUserId, toUserId)

  return response
}
