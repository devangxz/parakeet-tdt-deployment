import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import { redis } from '@/lib/redis'
import saveFileMetadata from '@/services/upload-service/save-file-metadata'
import {
  WORKER_QUEUE_NAMES,
  workerQueueService,
} from '@/services/worker-service'
import authenticateWebhook from '@/utils/authenticateWebhook'

export async function POST(req: NextRequest) {
  // Authenticate webhook and check rate limit
  const authResult = await authenticateWebhook(req, 'LAMBDA-METADATA-EXTRACTOR')
  if (authResult.error) return authResult.error

  const metadata = await req.json()

  try {
    if (!metadata || !metadata.fileId) {
      return NextResponse.json({ error: 'Invalid metadata' }, { status: 400 })
    }

    if (metadata.status === 'SUCCESS') {
      await saveFileMetadata(metadata)

      try {
        await workerQueueService.createJob(
          WORKER_QUEUE_NAMES.AUDIO_VIDEO_CONVERSION,
          {
            userId: metadata.userId,
            fileId: metadata.fileId,
            fileKey: metadata.fileKey,
          }
        )
      } catch (error) {
        logger.error(
          `Error creating audio/video conversion job - userId: ${metadata.userId}, fileId: ${metadata.fileId}, fileKey: ${metadata.fileKey}: ${error}`
        )
      }
    }

    await redis.publish(
      'file-events',
      JSON.stringify({
        type: 'METADATA_EXTRACTION',
        file: {
          id: metadata?.fileId,
          status: metadata?.status,
          fileNameWithExtension: metadata?.fileNameWithExtension,
        },
      })
    )

    return new Response(null, { status: 200 })
  } catch (error) {
    logger.error(
      `Error processing lambda-metadata-extractor webhook for file ID ${metadata.fileId}: ${error}`
    )
    return NextResponse.json(
      {
        error: `Error processing lambda-metadata-extractor webhook for file ID ${metadata.fileId}`,
      },
      { status: 500 }
    )
  }
}
