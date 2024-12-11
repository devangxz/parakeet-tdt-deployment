import { toast } from 'sonner'

import { unassignFile } from '@/app/actions/cf/unassign'
import { unassignQCFile } from '@/app/actions/qc/unassign'

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
    let response
    if (type === 'QC') {
      response = await unassignQCFile(id)
    } else {
      response = await unassignFile(id)
    }

    if (response.success) {
      toast.success('File unassigned successfully')
      changeTab('available')
    } else {
      toast.error(response.message)
    }
  } catch (error) {
    toast.error('Error unassigning file')
  } finally {
    setLoadingFileOrder((prev) => ({ ...prev, [id]: false }))
  }
}
