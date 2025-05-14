'use server'

import axios from 'axios'

import { FILE_CACHE_URL } from '@/constants'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export interface TrimAudioChunkResponse {
  success: boolean
  data?: {
    trimmedFileId: string
    message: string
  }
  message?: string
}

/**
 * Server action to trim an audio file at a specific chunk point
 * @param fileId The ID of the file to trim
 * @param chunkPoint The time in seconds to trim at
 * @returns Response with the trimmed file ID
 */
export async function trimAudioChunkAction(
  fileId: string,
  chunkPoint: number
): Promise<TrimAudioChunkResponse> {
  try {
    // Verify the file exists and is converted
    const file = await prisma.file.findUnique({
      where: {
        fileId: fileId
      },
      select: {
        converted: true
      }
    })

    if (!file) {
      return {
        success: false,
        message: 'File not found'
      }
    }

    if (!file.converted) {
      return {
        success: false,
        message: 'File is still being processed. Please try again later.'
      }
    }

    // Call the file cache service to trim the audio
    const response = await axios.post(
      `${FILE_CACHE_URL}/trim-audio-chunk`,
      {
        fileId,
        chunkPoint,
      },
      {
        headers: {
          'x-api-key': process.env.SCRIBIE_API_KEY,
        },
      }
    )

    return {
      success: true,
      data: response.data
    }
  } catch (error) {
    logger.error(`Error trimming audio at chunk point: ${error}`)
    return {
      success: false,
      message: 'An error occurred while trimming the audio at the specified chunk point'
    }
  }
} 