/* eslint-disable @typescript-eslint/no-explicit-any */
import { getServerSession } from 'next-auth/next'

import List from './list'
import { getPendingHighDifficultyCount } from '@/app/actions/invoice/pending-high-difficulty'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import { getFilesByStatus } from '@/services/file-service/get-files'
import { User } from '@/types/files'

interface File {
  id: string
  filename: string
  date: string
  duration: number
  orderType: string
  uploadedByUser: User
  folderId: number | null
  orderStatus: string
}

export default async function InprogressFilesPage() {
  const session = await getServerSession(authOptions)
  const user = session?.user
  const response = await getFilesByStatus(
    'in-progress',
    user?.userId as number,
    user?.internalTeamUserId as number | null
  )
  let files: File[] = []

  if (response?.success && response.data) {
    files = response.data.map((file: any) => ({
      id: file.fileId,
      filename: file.filename,
      date: file.Orders[0]?.orderTs,
      duration: Number(file.duration),
      orderType: file.Orders[0]?.orderType,
      orderStatus: file.Orders[0]?.status,
      uploadedByUser: file.uploadedByUser,
      folderId: file.parentId,
    }))
  }

  // Check for pending high difficulty invoices
  const highDifficultyResponse = await getPendingHighDifficultyCount()
  const pendingHighDifficultyCount = highDifficultyResponse.success
    ? highDifficultyResponse.count
    : 0

  return (
    <>
      <List
        files={files}
        pendingHighDifficultyCount={pendingHighDifficultyCount}
      />
    </>
  )
}
