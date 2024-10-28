export const dynamic = 'force-dynamic'
import { Queue } from 'bullmq'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import { redis } from '@/lib/redis'

async function getQJobDetails(Q: Queue, qName = '') {
  logger.info(`--> getQJobDetails ${qName}`)
  const jobs = await Q.getJobs(['waiting', 'active'])
  jobs.forEach((job) => {
    logger.info(`Active Job - ID: ${job.id}`)
  })

  const jobDetails = jobs.map((job) => ({
    id: job.id,
    data: job.data,
    opts: job.opts,
    progress:
      typeof job.progress === 'function' ? job.progress() : job.progress,
    attemptsMade: job.attemptsMade,
    failedReason: job.failedReason,
    stacktrace: job.stacktrace,
  }))

  const jobCounts = await Q.getJobCounts()

  logger.info(`<-- getQJobDetails ${qName}`)
  return {
    jobDetails,
    total: jobCounts.waiting + jobCounts.delayed,
    waiting: jobCounts.waiting,
    delayed: jobCounts.delayed,
    active: jobCounts.active,
    completed: jobCounts.completed,
    failed: jobCounts.failed,
  }
}

export async function GET() {
  try {
    const queues = {
      orderQ: new Queue('order', { connection: redis }),
      fileQ: new Queue('file', { connection: redis }),
      alertQ: new Queue('alert', { connection: redis }),
    }

    const queueDetails = await Promise.all(
      Object.entries(queues).map(async ([name, queue]) => {
        const details = await getQJobDetails(queue, name)
        return { [name]: details }
      })
    )

    const result = Object.assign({}, ...queueDetails)

    return NextResponse.json(result)
  } catch (error) {
    logger.error('Error in monitor-for-dev-dashboard:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
