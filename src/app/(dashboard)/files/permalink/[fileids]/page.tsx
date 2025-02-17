import React from 'react'

import SelectedFiles from './SelectedFiles'
import { getAllFilesAction } from '@/app/actions/all-files'

interface FileResponse {
  fileId: string
  filename: string
  createdAt: Date | string
  duration: number
  fileStatus: string
  status: string
  orderType: string
  orderId: string | number
  parentId: number | null
}

interface SelectedFile {
  id: string
  name: string
  date: string
  duration: number
  fileStatus: string
  status: string
  orderType: string
  orderId: string | number
  folderId: number | null
}

interface PageProps {
  params: { fileids: string }
}

export default async function SelectedPage({ params }: PageProps) {
  const fileIdsParam = decodeURIComponent(params.fileids?.trim() || '')
  console.log(fileIdsParam)
  const fileIds = fileIdsParam.split(',')

  if (fileIds.length === 0) {
    return (
      <div className='p-4'>
        <h1 className='text-2xl font-semibold'>Permalink Files</h1>
        <p>No valid file IDs provided.</p>
      </div>
    )
  }

  const response = await getAllFilesAction(null, fileIds.join(','))
  if (!response.success) {
    return (
      <div className='p-4'>
        <h1 className='text-2xl font-semibold'>Permalink Files</h1>
        <p>Error fetching files: {response.message}</p>
      </div>
    )
  }

  const selectedFiles: SelectedFile[] = (
    response.data?.filesWithStatus || []
  ).map((file: FileResponse) => ({
    id: file.fileId,
    name: file.filename,
    date: file.createdAt.toString(),
    duration: file.duration,
    fileStatus: file.fileStatus,
    status: file.status,
    orderType: file.orderType || '',
    orderId: file.orderId || '',
    folderId: file.parentId,
  }))

  return (
    <div className='h-full flex-1 flex-col p-4 md:flex'>
      <div className='flex items-start justify-between mb-3'>
        <div>
          <h1 className='text-lg font-semibold md:text-lg'>
            Permalink ({selectedFiles?.length || 0})
          </h1>
        </div>
      </div>
      <SelectedFiles initialFiles={selectedFiles} />
    </div>
  )
}
