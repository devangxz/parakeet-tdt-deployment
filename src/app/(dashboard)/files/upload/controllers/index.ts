import { BACKEND_URL } from '@/constants'
import axiosInstance from '@/utils/axios'

export const listController = async (
  payload: { fileId: string; newFilename?: string },
  type: string
) => actions[type as keyof typeof actions](payload)

const deleteFile = async ({ fileId }: Record<string, unknown>) => {
  try {
    const response = await axiosInstance.delete(
      `${BACKEND_URL}/delete-file/${fileId}`
    )
    return response?.data?.message
  } catch (err) {
    throw err
  }
}

const actions = {
  deleteFile: (payload: Record<string, string>) => deleteFile(payload),
}
