import { Queue } from 'bullmq';

import { redis } from '../lib/redis';

const transcriptionQueue = new Queue('transcription', { connection: redis });

export class TranscriptionService {
  async createJob(fileKey: string): Promise<string> {
    const jobId = `job_${Date.now()}`;
    await transcriptionQueue.add('transcribe', { jobId, fileKey });
    return jobId;
  }

  getQueue(): Queue {
    return transcriptionQueue;
  }
}

export const transcriptionService = new TranscriptionService();