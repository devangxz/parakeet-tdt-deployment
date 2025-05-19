"use server"
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

interface GetAccentCodeResult {
  success: boolean
  accentCode: string
  message?: string
}

export async function getAccentCode(fileId: string): Promise<GetAccentCodeResult> {
  try {
    logger.info(`[getAccentCode] Fetching accent code for fileId ${fileId}`)
    if (!fileId) {
      return {
        success: false,
        message: 'File ID parameter is required.',
        accentCode: 'N/A',
      }
    }

    const accentData = await prisma.fileAccent.findFirst({
      where: { fileId: fileId },
      select: { accentCode: true }
    })

    if (!accentData) {
      return {
        success: false,
        message: 'Accent code not found for the given fileId.',
        accentCode: 'N/A',
      }
    }
    logger.info(`[getAccentCode] Found accent code for fileId ${fileId}`)
    return {
      success: true,
      accentCode: accentData.accentCode || 'N/A',
    }
  } catch (error) {
    logger.error(`Failed to fetch accent code for fileId ${fileId}`, error)
    return {
      success: false,
      message: 'An error occurred while fetching the accent code.',
      accentCode: 'N/A',
    }
  }
} 