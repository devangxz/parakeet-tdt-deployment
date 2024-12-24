import axios from 'axios'
import { Worker, Job } from 'bullmq'

import { processYoutubeVideo } from './processYoutubeVideo'
import { signJwtAccessToken } from '../lib/jwt'
import logger from '../lib/logger'
import { redis } from '../lib/redis'
import { WORKER_QUEUE_NAMES, QueueName } from '../services/worker-service'

const YOUTUBE_CALLBACK_URL = `${process.env.NEXT_PUBLIC_SITE_URL}/webhook/youtube-worker`

const createWorker = (
  queueName: QueueName,
  processFunction: (job: Job) => Promise<unknown>
) =>
  new Worker(
    queueName,
    async (job) => {
      try {
        const result = await processFunction(job)

        const token = signJwtAccessToken(
          { type: 'YOUTUBE-WORKER' },
          { expiresIn: '2h' }
        )
        await axios.post(YOUTUBE_CALLBACK_URL, result, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        return { status: 'completed', result }
      } catch (error) {
        throw error
      }
    },
    {
      connection: redis,
      concurrency: 1,
    }
  )

createWorker(WORKER_QUEUE_NAMES.YOUTUBE_VIDEO_PROCESSING, async (job) => {
  const { userId, fileId, youtubeUrl, fileKey } = job.data
  return await processYoutubeVideo(userId, fileId, youtubeUrl, fileKey)
})

logger.info('Youtube worker started')
