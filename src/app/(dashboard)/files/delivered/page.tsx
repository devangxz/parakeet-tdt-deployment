/* eslint-disable @typescript-eslint/no-explicit-any */
import { getServerSession } from 'next-auth/next'

import List from './list'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import { getFilesByStatus } from '@/services/file-service/get-files'
import { User } from '@/types/files'

interface File {
  id: string
  filename: string
  date: string
  duration: number
  orderType: string
  orderId: string
  uploadedByUser: User
}

export default async function DeliveredFilesPage() {
  const session = await getServerSession(authOptions)
  const user = session?.user
  const response = await getFilesByStatus(
    'delivered',
    user?.userId as number,
    user?.internalTeamUserId as number | null
  )
  let files: File[] = []

  if (response?.success && response.data) {
    files = response.data.map((file: any) => ({
      id: file.fileId,
      filename: file.filename,
      date: file.Orders[0]?.deliveredTs,
      duration: Number(file.duration),
      orderType: file.Orders[0]?.orderType,
      orderId: file.Orders[0]?.id,
      uploadedByUser: file.uploadedByUser,
    }))
  }

  return (
    <>
      <List files={files} />
    </>
  )
}
