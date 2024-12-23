'use server'

import logger from '@/lib/logger'
import getSpeakerNames from '@/services/editor-service/getSpeakerNames'

export async function getSpeakerNamesAction(fileId: string) {
  try {
    if (!fileId) {
      return {
        success: false,
        error: 'File ID is required',
      }
    }

    const { success, data, message } = await getSpeakerNames(fileId)

    if (success === false) {
      return {
        success: false,
        error: message,
      }
    }

    const speakerNames = data

    if (!speakerNames) {
      return {
        success: true,
        data: [],
      }
    }

    if (!speakerNames[fileId] || !speakerNames[fileId].length) {
      return {
        success: true,
        data: [],
      }
    }

    const speakerNamesList = speakerNames[fileId]

    return {
      success: true,
      data: speakerNamesList,
    }
  } catch (error) {
    logger.error(`error getting speaker name for file ${fileId}: ${error}`)
    return {
      success: false,
      data: [],
      error: 'Failed to fetch speaker names',
    }
  }
}
