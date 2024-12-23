/* eslint-disable @typescript-eslint/no-unused-vars */
import axios from 'axios'
import { getSession } from 'next-auth/react'

import { archiveFileAction } from '@/app/actions/file/archive'
import { renameFileAction } from '@/app/actions/file/rename'
import { deleteFilesAction } from '@/app/actions/files/delete'
import { getFileDocxSignedUrl } from '@/app/actions/order/file-docx-signed-url'
import { updateOrderRating } from '@/app/actions/order/rating'
import { FILE_CACHE_URL } from '@/constants'
export const orderController = async (
  payload: { fileId: string; filename?: string; docType?: string },
  type: string
) =>
  actions[type as keyof typeof actions](
    payload as { fileId: string; filename?: string; docType?: string }
  )

const downloadFile = async ({
  fileId,
  docType,
}: {
  fileId: string
  docType?: string
}) => {
  try {
    if (docType === 'CUSTOM_FORMATTING_DOC') {
      const res = await getFileDocxSignedUrl(fileId, docType)
      if (res && res.success && res.signedUrl) {
        window.open(res.signedUrl, '_blank')
      } else {
        console.error('No URL provided for download.')
        throw 'No URL provided for download.'
      }
      return res.message
    }
  } catch (err) {
    throw new Error('Failed to download file')
  }
}

const deleteFile = async ({
  fileId,
}: {
  fileId: string
  filename?: string
  docType?: string
}) => {
  try {
    const response = await deleteFilesAction([fileId])
    return response?.s
  } catch (err) {
    throw err
  }
}

const archiveFile = async ({
  fileId,
}: {
  fileId: string
  filename?: string
  docType?: string
}) => {
  try {
    const response = await archiveFileAction(fileId)
    return response?.s
  } catch (err) {
    throw err
  }
}

const renameFile = async ({
  fileId,
  filename = 'newFile',
}: {
  fileId: string
  filename?: string
  docType?: string
}) => {
  try {
    const response = await renameFileAction(fileId, filename)
    return response?.s
  } catch (err) {
    throw err
  }
}

const rateFile = async ({
  fileId,
  filename,
  docType,
  rating,
}: {
  fileId: string
  filename?: string
  docType?: string
  rating?: number
}) => {
  try {
    if (!rating) {
      throw new Error('Rating is required')
    }
    const response = await updateOrderRating(fileId, rating)
    return response?.message
  } catch (err) {
    throw err
  }
}

const actions = {
  downloadFile: (payload: {
    fileId: string
    filename?: string
    docType?: string
  }) => downloadFile(payload),
  deleteFile: (payload: {
    fileId: string
    filename?: string
    docType?: string
  }) => deleteFile(payload),
  archiveFile: (payload: {
    fileId: string
    filename?: string
    docType?: string
  }) => archiveFile(payload),
  renameFile: (payload: {
    fileId: string
    filename?: string
    docType?: string
  }) => renameFile(payload),
  rateFile: (payload: {
    fileId: string
    filename?: string
    docType?: string
    rating?: number
  }) => rateFile(payload),
}
