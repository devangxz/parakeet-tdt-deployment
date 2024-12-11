import { deleteFilesAction } from '@/app/actions/files/delete'
import { BACKEND_URL } from '@/constants'
import axiosInstance from '@/utils/axios'

export const listController = async (
  payload: { fileId: string; newFilename?: string },
  type: string
) => actions[type as keyof typeof actions](payload)

const downloadFile = async ({ fileId }: Record<string, unknown>) => {
  try {
    const response = await axiosInstance.get(
      `${BACKEND_URL}/file-signed-url?fileId=${fileId}`
    )
    const url = response?.data?.signedUrl
    if (url) {
      window.location.href = url
    } else {
      console.error('No URL provided for download.')
      throw 'No URL provided for download.'
    }
    return response?.data?.file?.filename
  } catch (err) {
    throw err
  }
}

const deleteFile = async ({ fileId }: Record<string, unknown>) => {
  try {
    const response = await deleteFilesAction([fileId as string])
    return response?.s
  } catch (err) {
    throw err
  }
}

const actions = {
  downloadFile: (payload: Record<string, string>) => downloadFile(payload),
  deleteFile: (payload: Record<string, string>) => deleteFile(payload),
}
