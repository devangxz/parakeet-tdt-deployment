import axios from 'axios';
import { Worker, Job } from 'bullmq';

import { convertAudioVideo } from './convertAudioVideo';
import { signJwtAccessToken } from '../lib/jwt';
import logger from '../lib/logger';
import { redis } from '../lib/redis';
import { WORKER_QUEUE_NAMES, QueueName } from '../services/worker-service';

const CONVERSION_CALLBACK_URL = `${process.env.NEXT_PUBLIC_SITE_URL}/webhook/conversion-worker`;

const createWorker = (queueName: QueueName, processFunction: (job: Job) => Promise<unknown>) => new Worker(queueName, async (job) => {
    try {
        const result = await processFunction(job);

        const token = signJwtAccessToken({ type: 'CONVERSION-WORKER' }, { expiresIn: '2h' });
        await axios.post(CONVERSION_CALLBACK_URL, result, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        return { status: 'completed', result };
    } catch (error) {
        throw error;
    }
}, {
    connection: redis,
    concurrency: 2
});

createWorker(WORKER_QUEUE_NAMES.AUDIO_VIDEO_CONVERSION, async (job) => {
    const { userId, fileId, fileKey } = job.data;
    return await convertAudioVideo(userId, fileId, fileKey);
});

logger.info('Conversion worker started');