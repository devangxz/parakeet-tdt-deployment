import { Worker, Job } from 'bullmq';

import { convertAudioVideo } from './convertAudioVideo';
import logger from '../lib/logger';
import { redis } from '../lib/redis';
import { WORKER_QUEUE_NAMES, QueueName } from '../services/worker-service';

const createWorker = (queueName: QueueName, processFunction: (job: Job) => Promise<unknown>) => new Worker(queueName, async (job) => {
    try {
        const result = await processFunction(job);
        return { status: 'completed', result };
    } catch (error) {
        throw error;
    }
}, {
    connection: redis,
    concurrency: 1
});

// Create workers for each queue
const audioVideoConversionWorker = createWorker(WORKER_QUEUE_NAMES.AUDIO_VIDEO_CONVERSION, async (job) => {
    const { fileKey, userEmailId, fileName } = job.data;
    return await convertAudioVideo(fileKey, userEmailId, fileName);
});

logger.info('All workers started');

export { audioVideoConversionWorker };