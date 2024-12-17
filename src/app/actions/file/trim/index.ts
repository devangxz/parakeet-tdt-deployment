'use server'

import axios from 'axios'

import { FILE_CACHE_URL } from '@/constants'
import logger from '@/lib/logger'

export async function trimAudioAction(
  fileId: string,
  startTime: number,
  endTime: number
) {
  try {
    const response = await axios.post(
      `${FILE_CACHE_URL}/trim-audio`,
      {
        fileId,
        start: startTime,
        end: endTime,
      },
      {
        headers: {
          'x-api-key': process.env.CRON_API_KEY,
        },
      }
    )

    return {
      success: true,
      data: response.data,
    }
  } catch (error) {
    logger.error('Error trimming audio:', error)
    return {
      success: false,
      s: 'An error occurred while trimming the audio',
    }
  }
}
