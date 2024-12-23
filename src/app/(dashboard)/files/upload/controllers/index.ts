'use server'

import { deleteFilesAction } from '@/app/actions/files/delete'

export const listController = async (
  payload: { fileId: string; newFilename?: string },
  type: string
) => actions[type as keyof typeof actions](payload)

const deleteFile = async ({ fileId }: Record<string, unknown>) => {
  try {
    const response = await deleteFilesAction([fileId as string])
    return response.s
  } catch (err) {
    throw err
  }
}

const actions = {
  deleteFile: (payload: Record<string, string>) => deleteFile(payload),
}
