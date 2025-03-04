'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import { submitQCFile } from '@/services/editor-service/submit-qc-file'
import { CTMType } from '@/types/editor'

interface SubmitQCParams {
  orderId: number
  fileId: string
  transcript: string
  currentAlignments: CTMType[]
}

export async function submitQCAction({
  orderId,
  fileId,
  transcript,
  currentAlignments,
}: SubmitQCParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    const transcriberId = session.user.userId

    if (!fileId) {
      throw new Error('File ID is required')
    }

    await submitQCFile(orderId, transcriberId, transcript, currentAlignments)
    logger.info(`QC submitted for file ${fileId} by ${transcriberId}`)

    return { success: true }
  } catch (error) {
    logger.error(`Error submitting file ${fileId}: ${error}`)
    throw new Error('Failed to submit QC')
  }
}
