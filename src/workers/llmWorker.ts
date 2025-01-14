import axios from 'axios';
import { Worker, Job } from 'bullmq';

import { markTranscript } from './markTranscript';
import { signJwtAccessToken } from '../lib/jwt';
import logger from '../lib/logger';
import { redis } from '../lib/redis';
import { WORKER_QUEUE_NAMES, QueueName } from '../services/worker-service';

const LLM_CALLBACK_URL = `${process.env.NEXT_PUBLIC_SITE_URL}/webhook/llm-worker`;

const createWorker = (queueName: QueueName, processFunction: (job: Job) => Promise<unknown>) => new Worker(queueName, async (job) => {
    try {
        const result = await processFunction(job);
        if (result) {
            const token = signJwtAccessToken({ type: 'LLM-WORKER' }, { expiresIn: '2h' });
            await axios.post(LLM_CALLBACK_URL, result, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
        }
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