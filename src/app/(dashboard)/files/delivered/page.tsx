/* eslint-disable @typescript-eslint/no-explicit-any */
import { getServerSession } from 'next-auth/next'

import List from './list'
import { getFileDocxSignedUrl } from '@/app/actions/order/file-docx-signed-url'
import { getFileTxtSignedUrl } from '@/app/actions/order/file-txt-signed-url'
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
  txtSignedUrl: string
  cfDocxSignedUrl: string
}

export default async function DeliveredFilesPage() {
  const session = await getServerSession(authOptions)
  const user = session?.user
  const response = await getFilesByStatus(
    'delivered',
    user?.userId as number,
    user?.internalTeamUserId as number | null
  )
  const files: File[] = []

  if (response?.success && response.data) {
    for (const file of response.data as any[]) {
      const txtRes = await getFileTxtSignedUrl(`${file.fileId}`)
      const docxRes = await getFileDocxSignedUrl(`${file.fileId}`, 'CUSTOM_FORMATTING_DOC')

      files.push({
        id: file.fileId,
        filename: file.filename,
        date: file.Orders[0]?.deliveredTs,
        duration: Number(file.duration),
        orderType: file.Orders[0]?.orderType,
        orderId: file.Orders[0]?.id,
        uploadedByUser: file.uploadedByUser,
        txtSignedUrl: txtRes.signedUrl || '',
        cfDocxSignedUrl: docxRes ? docxRes.signedUrl || '' : '',
      })
    }
  }

  return (
    <>
      <List files={files} />
    </>
  )
}
