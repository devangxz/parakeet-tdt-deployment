import { Worker, Job } from 'bullmq';

import { performASR } from './performASR';
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

const automaticSpeechRecognitionWorker = createWorker(WORKER_QUEUE_NAMES.AUTOMATIC_SPEECH_RECOGNITION, async (job) => {
    const { fileId } = job.data;
    return await performASR(fileId);
});

logger.info('ASR worker started');

export { automaticSpeechRecognitionWorker };