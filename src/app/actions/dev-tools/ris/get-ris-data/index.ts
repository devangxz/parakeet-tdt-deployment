'use server'

import logger from '@/lib/logger'
import extractDataFromRISFile from '@/services/file-service/get-ris'

export async function getRISData(
  fileId: string,
  template: string,
  organization: string
) {
  if (!fileId || !template || !organization) {
    return {
      success: false,
      message: 'Missing required parameters',
    }
  }

  try {
    logger.info(`Fetching RIS data for fileId: ${fileId}`)
    const risData = await extractDataFromRISFile(fileId, template, organization)

    logger.info(`Successfully retrieved RIS data for fileId: ${fileId}`)
    return {
      success: true,
      risData,
    }
  } catch (error) {
    logger.error(`Error fetching RIS data for fileId ${fileId}:`, error)
    return {
      success: false,
      message: 'Failed to retrieve RIS data',
    }
  }
}
