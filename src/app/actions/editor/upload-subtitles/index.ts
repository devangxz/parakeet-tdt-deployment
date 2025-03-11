'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import { uploadToS3 } from '@/utils/backend-helper'

interface SubtitleFiles {
  srt: string
  vtt: string
}

export async function uploadSubtitlesAction(fileId: string, subtitles: SubtitleFiles) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    if (!fileId) {
      throw new Error('File ID is required')
    }

    await uploadToS3(`${fileId}.srt`, subtitles.srt, 'application/x-subrip')
    await uploadToS3(`${fileId}.vtt`, subtitles.vtt, 'text/vtt')

    logger.info(`Subtitle files uploaded for ${fileId}`)
    return { success: true }
  } catch (error) {
    logger.error(`Error uploading subtitle files for ${fileId}: ${error}`)
    throw new Error('Failed to upload subtitle files')
  }
} 