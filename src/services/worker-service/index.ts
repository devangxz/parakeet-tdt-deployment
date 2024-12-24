import { Queue } from 'bullmq'

import { redis } from '../../lib/redis'

export const WORKER_QUEUE_NAMES = {
  AUDIO_VIDEO_CONVERSION: 'audio_video_conversion',
  AUTOMATIC_SPEECH_RECOGNITION: 'automatic_speech_recognition',
  LLM_MARKING: 'llm_marking',
  YOUTUBE_VIDEO_PROCESSING: 'youtube_video_processing',
} as const

export type QueueName =
  (typeof WORKER_QUEUE_NAMES)[keyof typeof WORKER_QUEUE_NAMES]

const queues: Record<QueueName, Queue> = {
  [WORKER_QUEUE_NAMES.AUDIO_VIDEO_CONVERSION]: new Queue(
    WORKER_QUEUE_NAMES.AUDIO_VIDEO_CONVERSION,
    { connection: redis }
  ),
  [WORKER_QUEUE_NAMES.AUTOMATIC_SPEECH_RECOGNITION]: new Queue(
    WORKER_QUEUE_NAMES.AUTOMATIC_SPEECH_RECOGNITION,
    { connection: redis }
  ),
  [WORKER_QUEUE_NAMES.LLM_MARKING]: new Queue(WORKER_QUEUE_NAMES.LLM_MARKING, {
    connection: redis,
  }),
  [WORKER_QUEUE_NAMES.YOUTUBE_VIDEO_PROCESSING]: new Queue(
    WORKER_QUEUE_NAMES.YOUTUBE_VIDEO_PROCESSING,
    { connection: redis }
  ),
}

export class WorkerQueueService {
  async createJob(
    queueName: QueueName,
    jobData: Record<string, unknown>
  ): Promise<undefined> {
    await queues[queueName].add(queueName, { queueName, ...jobData })
    return
  }

  getQueue(queueName: QueueName): Queue {
    return queues[queueName]
  }

  async hasExistingJob(queueName: QueueName, fileId: string): Promise<boolean> {
    try {
      const queue = this.getQueue(queueName)

      const [waiting, active, delayed] = await Promise.all([
        queue.getWaiting().catch(() => []),
        queue.getActive().catch(() => []),
        queue.getDelayed().catch(() => []),
      ])

      const allJobs = [...waiting, ...active, ...delayed]
      return allJobs.some((job) => job.data.fileId === fileId)
    } catch (error) {
      return false
    }
  }
}

export const workerQueueService = new WorkerQueueService()
