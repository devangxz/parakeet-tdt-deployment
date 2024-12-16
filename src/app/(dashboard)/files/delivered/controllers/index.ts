/* eslint-disable @typescript-eslint/no-unused-vars */
import axios from 'axios'

import { archiveFileAction } from '@/app/actions/file/archive'
import { renameFileAction } from '@/app/actions/file/rename'
import { deleteFilesAction } from '@/app/actions/files/delete'
import { updateOrderRating } from '@/app/actions/order/rating'
import { FILE_CACHE_URL } from '@/constants'
import { getSession } from 'next-auth/react'
export const orderController = async (
  payload: { fileId: string; filename?: string; docType?: string },
  type: string
) =>
  actions[type as keyof typeof actions](
    payload as { fileId: string; filename?: string; docType?: string }
  )

// /file-pdf-signed-url
const downloadPDFFile = async ({
  fileId,
  docType,
  filename,
}: {
  fileId: string
  filename?: string
  docType?: string
}) => {
  try {

    const session = await getSession()

    if (docType === 'TRANSCRIPTION_DOC') {
      window.open(`${FILE_CACHE_URL}/get-tr-pdf/${fileId}?authToken=${session?.user?.token}`, '_blank');
      return 'PDF file download initiated';
    } else if (docType === 'CUSTOM_FORMATTING_DOC') {
      window.open(`${FILE_CACHE_URL}/get-cf-pdf/${fileId}?authToken=${session?.user?.token}`, '_blank');
      return 'PDF file download initiated';
    }
  } catch (err) {
    console.error('Error downloading PDF file:', err)
    throw new Error('Failed to download PDF file')
  }
}

const downloadFile = async ({
  fileId,
  docType,
  filename,
}: {
  fileId: string
  filename?: string
  docType?: string
}) => {
  try {
    const session = await getSession()
    if (docType === 'TRANSCRIPTION_DOC') {
      window.open(`${FILE_CACHE_URL}/get-tr-docx/${fileId}?authToken=${session?.user?.token}`, '_blank');
      return 'DOCX file download initiated';
    } else {
      const response = await axios.get(
        `/api/order/file-docx-signed-url?fileId=${fileId}&docType=${docType}`
      )
      const url = response?.data?.signedUrl
      if (url) {
        window.open(url, '_blank')
      } else {
        console.error('No URL provided for download.')
        throw 'No URL provided for download.'
      }
      return response?.data?.message
    }
  } catch (err) {
    throw new Error('Failed to download file')
  }
}

const downloadTxt = async ({
  fileId,
}: {
  fileId: string
  filename?: string
  docType?: string
}) => {
  try {
    const response = await axios.get(`/api/order/download-txt?fileId=${fileId}`)
    const { content, type } = response.data

    const blob = new Blob([content], { type })
    const url = window.URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = `${fileId}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    window.URL.revokeObjectURL(url)

    return 'Txt file downloaded successfully'
  } catch (err) {
    console.error('Error downloading TXT file:', err)
    throw new Error('Failed to download TXT file')
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

const downloadSubtitle = async ({
  fileId,
  filename,
  docType,
}: {
  fileId: string
  filename?: string
  docType?: string
}) => {
  try {
    const ext = docType?.toLowerCase()
    const response = await axios.get(
      `/api/order/download-subtitle?fileId=${fileId}&docType=${docType}`
    )

    const { content, type } = response.data

    const blob = new Blob([content], { type })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${filename}.${ext}`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Clean up the URL object
    window.URL.revokeObjectURL(url)

    return `${docType} file downloaded Successfully`
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
  downloadPDFFile: (payload: {
    fileId: string
    filename?: string
    docType?: string
  }) => downloadPDFFile(payload),
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
  downloadSubtitle: (payload: {
    fileId: string
    filename?: string
    docType?: string
  }) => downloadSubtitle(payload),
  rateFile: (payload: {
    fileId: string
    filename?: string
    docType?: string
    rating?: number
  }) => rateFile(payload),
  downloadTxt: (payload: {
    fileId: string
    filename?: string
    docType?: string
  }) => downloadTxt(payload),
}
