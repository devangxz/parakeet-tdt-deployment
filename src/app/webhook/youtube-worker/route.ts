import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAWSSesInstance } from '@/lib/ses'
import authenticateWebhook from '@/utils/authenticateWebhook'

export async function POST(req: NextRequest) {
  // Authenticate webhook and check rate limit
  const authResult = await authenticateWebhook(req, 'YOUTUBE-WORKER')
  if (authResult.error) return authResult.error

  const youtubeProcessResult = await req.json()

  try {
    if (!youtubeProcessResult || !youtubeProcessResult.status) {
      return NextResponse.json(
        { error: 'Invalid YouTube import result' },
        { status: 400 }
      )
    }

    const { status, userId, fileId, youtubeUrl, fileSize } =
      youtubeProcessResult

    try {
      if (status === 'SUCCESS') {
        await prisma.youTubeFile
          .update({
            where: { fileId },
            data: { isImported: true },
          })
          .catch((error) => {
            logger.error(
              `Failed to update YouTube import status in database: ${fileId}: ${error}`
            )
          })

        await prisma.file
          .update({
            where: { fileId },
            data: { filesize: Math.floor(fileSize ?? 0).toString() },
          })
          .catch((error) => {
            logger.error(
              `Failed to update file size in database: ${fileId}: ${error}`
            )
          })
      } else {
        await prisma.youTubeFile
          .update({
            where: { fileId },
            data: { isImported: false },
          })
          .catch((updateError) => {
            logger.error(
              `Error updating YouTube process failure status: ${updateError}`
            )
          })

        const ses = getAWSSesInstance()
        await ses.sendAlert(
          `YouTube Process Failed`,
          `YouTube process failed. User ID: ${userId}, File ID: ${fileId}, YouTube URL: ${youtubeUrl}`,
          'software'
        )
      }
    } catch (error) {
      logger.error(
        `Error processing youtube-worker result for fileId ${fileId}: ${error}`
      )
      throw error
    }

    logger.info(
      `YouTube-worker webhook processed successfully for file ID ${youtubeProcessResult.fileId}`
    )
    return NextResponse.json(null, { status: 200 })
  } catch (error) {
    logger.error(
      `Error processing youtube-worker webhook for File ID ${youtubeProcessResult?.fileId}, User ID: ${youtubeProcessResult?.userId}, URL: ${youtubeProcessResult?.youtubeUrl}: ${error}`
    )
    return NextResponse.json(
      {
        error: `Error processing youtube-worker webhook for File ID ${youtubeProcessResult?.fileId}, User ID: ${youtubeProcessResult?.userId}, URL: ${youtubeProcessResult?.youtubeUrl}`,
      },
      { status: 500 }
    )
  }
}
