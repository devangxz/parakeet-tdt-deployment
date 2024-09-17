import { BACKEND_URL } from '@/constants'
import axiosInstance from '@/utils/axios'

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
}: {
  fileId: string
  filename?: string
  docType?: string
}) => {
  try {
    const response = await axiosInstance.get(
      `${BACKEND_URL}/file-pdf-signed-url?fileId=${fileId}&docType=${docType}`
    )
    const url = response?.data?.signedUrl
    if (url) {
      window.location.href = url
    } else {
      console.error('No URL provided for PDF download.')
      throw new Error('No URL provided for PDF download.')
    }
    return response?.data?.message
  } catch (err) {
    throw err
  }
}

const downloadFile = async ({
  fileId,
  docType,
}: {
  fileId: string
  filename?: string
  docType?: string
}) => {
  try {
    const response = await axiosInstance.get(
      `${BACKEND_URL}/file-docx-signed-url?fileId=${fileId}&docType=${docType}`
    )
    const url = response?.data?.signedUrl
    if (url) {
      window.location.href = url
    } else {
      console.error('No URL provided for download.')
      throw 'No URL provided for download.'
    }
    return response?.data?.message
  } catch (err) {
    throw err
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
    const response = await axiosInstance.get(
      `${BACKEND_URL}/download-txt?fileId=${fileId}`
    )
    const url = response?.data?.url
    if (url) {
      window.open(url, '_blank')
    } else {
      throw 'Fail to download txt file'
    }
    return 'Txt file downloaded successfully'
  } catch (err) {
    throw err
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
    const response = await axiosInstance.post(`${BACKEND_URL}/delete-files`, {
      fileIds: [fileId],
    })
    return response?.data?.message
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
    const response = await axiosInstance.post(`${BACKEND_URL}/archive-file`, {
      fileIds: fileId,
    })
    return response?.data?.message
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
    const response = await axiosInstance.post(`${BACKEND_URL}/file-rename`, {
      fileId,
      filename,
    })
    return response?.data?.message
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
    const response = await axiosInstance.get(
      `${BACKEND_URL}/download-subtitle?fileId=${fileId}&docType=${docType}`,
      {
        headers: {
          Accept: 'text/plain',
        },
        responseType: 'blob',
      }
    )
    const url = window.URL.createObjectURL(
      new Blob([response.data], { type: 'text/plain' })
    )
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${filename}.${ext}`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
    const response = await axiosInstance.post(`${BACKEND_URL}/order-rating`, {
      fileId,
      filename,
      rating,
      docType,
    })
    return response?.data?.message
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
