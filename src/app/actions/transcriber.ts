'use server'

import { isTranscriberICQC } from '@/utils/backend-helper'

export async function checkTranscriberICQCStatus(transcriberId: number) {
  try {
    return await isTranscriberICQC(transcriberId)
  } catch (error) {
    console.error('Error checking IC QC status:', error)
    return {
      isICQC: false,
      qcRate: 0,
      cfRate: 0,
      cfRRate: 0,
    }
  }
}
