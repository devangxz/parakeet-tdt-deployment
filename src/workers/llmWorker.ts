import { Worker, Job } from 'bullmq';

import { markTranscript } from './markTranscript';
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

const LLMWorker = createWorker(WORKER_QUEUE_NAMES.LLM_MARKING, async (job) => {
    const { fileId, orderId } = job.data;
    return await markTranscript(orderId, fileId);
});

logger.info('LLM worker started');

export { LLMWorker };