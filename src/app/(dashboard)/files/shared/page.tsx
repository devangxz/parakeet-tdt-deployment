/* eslint-disable @typescript-eslint/no-explicit-any */
import { getServerSession } from 'next-auth/next'

import List from './list'
import { getFileDocxSignedUrl } from '@/app/actions/order/file-docx-signed-url'
import { getFileTxtSignedUrl } from '@/app/actions/order/file-txt-signed-url'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import { getSharedFiles } from '@/services/file-service/get-files'

interface File {
  id: number
  fileId: string
  permission: string
  filename: string
  duration: number
  fromUserId: number
  email: string
  fullname: string
  status: string
  deliveredTs: string
  rating: string
  orderType: string
  orderId: number
  txtSignedUrl: string
  cfDocxSignedUrl: string
}

export default async function ArchivedFilesPage() {
  const session = await getServerSession(authOptions)
  const user = session?.user
  const userId = user?.internalTeamUserId || (user?.userId as number)
  const response = await getSharedFiles(userId)

  const files: File[] = []

  if (response?.success && response.data) {
    for (const file of response.data as any[]) {
      const txtRes = await getFileTxtSignedUrl(`${file.fileId}`)
      const docxRes = await getFileDocxSignedUrl(`${file.fileId}`, 'CUSTOM_FORMATTING_DOC')

      files.push({
        id: file.id,
        fileId: file.fileId,
        filename: file.filename,
        duration: Number(file.duration),
        orderType: file.Orders[0]?.orderType,
        orderId: file.Orders[0]?.id,
        txtSignedUrl: txtRes.signedUrl || '',
        cfDocxSignedUrl: docxRes ? docxRes.signedUrl || '' : '',
        permission: file.permission,
        fromUserId: file.fromUserId,
        email: file.email,
        fullname: file.fullname,
        status: file.status,
        deliveredTs: file.deliveredTs,
        rating: file.rating
      })
    }
  }

  return (
    <>
      <List files={files || []} />
    </>
  )
}
