import axios from 'axios'

export const listController = async (
  payload: { fileId: string; newFilename?: string },
  type: string
) => actions[type as keyof typeof actions](payload)

const deleteFile = async ({ fileId }: Record<string, unknown>) => {
  try {
    const response = await axios.post(`/api/files/delete`, {
      data: { fileId: [fileId] },
    })
    return response?.data?.message
  } catch (err) {
    throw err
  }
}

const actions = {
  deleteFile: (payload: Record<string, string>) => deleteFile(payload),
}
