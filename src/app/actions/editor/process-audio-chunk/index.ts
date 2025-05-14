'use server'

import axios from 'axios'

import { extractAccentAction } from '../process-trimmed-audio'
import { FILE_CACHE_URL } from '@/constants'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export interface GetAccentResult {
  success: boolean
  message?: string
  data?: string
  fileId?: string
  error?: string
}

export async function getAccentAction(
  fileId: string,
): Promise<GetAccentResult> {
  try {
    // Step 1: Trim the audio file at the chunk point
    logger.info(`Getting Accent for audio file ${fileId} `)
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
      `${FILE_CACHE_URL}/get-accent`,
      {
        fileId
      },
      {
        headers: {
          'x-api-key': process.env.SCRIBIE_API_KEY,
        },
      }
    )
    
    logger.info(`Successfully trimmed audio. New file ID: ${fileId}`)
    
    // Step 2: Process the trimmed audio file with Google AI
    logger.info(`Extracting accent from audio file: ${fileId}`)
    const processResult = await extractAccentAction(
      `${fileId}.mp3`, // Assuming the file is in mp3 format
      response.data.uploadResult
    )
    
    if (!processResult.success) {
      return {
        success: false,
        fileId,
        error: processResult.error || 'Failed to process trimmed audio file'
      }
    }
    
    // Return combined results
    return {
      success: true,
      fileId,
      data: processResult.data
    }
  } catch (error) {
    logger.error(`Error in processAudioChunkAction: ${error}`)
    return {
      success: false,
      error: `Processing failed: ${error instanceof Error ? error.message : String(error)}`
    }
  }
} 