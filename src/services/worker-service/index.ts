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
    const jobId = jobData.fileId as string
    await queues[queueName].add(
      queueName,
      { queueName, ...jobData },
      {
        jobId,
        removeOnComplete: true,
      }
    )
    return
  }

  getQueue(queueName: QueueName): Queue {
    return queues[queueName]
  }

  async hasExistingJob(queueName: QueueName, fileId: string): Promise<boolean> {
    const queue = this.getQueue(queueName)
    try {
      const jobById = await queue.getJob(fileId)
      if (jobById !== null) return true

      const jobs = await queue.getJobs(
        ['waiting', 'active', 'delayed'],
        0,
        50,
        false
      )
      return jobs.some((job) => job.data.fileId === fileId)
    } catch (error) {
      console.error(
        `Error checking queue ${queueName} for fileId ${fileId}:`,
        error
      )
      return false
    }
  }
}

export const workerQueueService = new WorkerQueueService()
