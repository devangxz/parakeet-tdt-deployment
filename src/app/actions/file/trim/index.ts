'use server'

import axios from 'axios'

import { FILE_CACHE_URL } from '@/constants'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function trimAudioAction(
  fileId: string,
  startTime: number,
  endTime: number
) {
  try {
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
        s: 'File not found'
      }
    }

    if (!file.converted) {
      return {
        success: false,
        s: 'File is still being processed. Please try again later.'
      }
    }

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
