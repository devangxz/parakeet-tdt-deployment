import { AxiosError } from 'axios'
import { toast } from 'sonner'

import { BACKEND_URL } from '@/constants'
import axiosInstance from '@/utils/axios'

interface UnassignFileParams {
  id: number
  setLoadingFileOrder: React.Dispatch<
    React.SetStateAction<Record<number, boolean>>
  >
  changeTab: (tabName: string) => void
  type: string
}

export const unassignmentHandler = async ({
  id,
  setLoadingFileOrder,
  changeTab,
  type,
}: UnassignFileParams): Promise<void> => {
  setLoadingFileOrder((prev) => ({ ...prev, [id]: true }))

  try {
    const url = type === 'QC' ? 'unassign-file' : 'unassign-review-file'
    await axiosInstance.post(`${BACKEND_URL}/${url}`, {
      orderId: id,
      type,
    })
    toast.success('File unassigned successfully')
    changeTab('available')
  } catch (error) {
    if (error instanceof AxiosError && error.response) {
      const errorToastId = toast.error(error.response.data.error)
      toast.dismiss(errorToastId)
    } else {
      toast.error('Error unassigning file')
    }
  } finally {
    setLoadingFileOrder((prev) => ({ ...prev, [id]: false }))
  }
}
