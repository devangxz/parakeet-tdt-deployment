import { Worker, Job } from 'bullmq';

import { convertAudioVideo } from './convertAudioVideo';
import { markTranscript } from './markTranscript';
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

// Create workers for each queue
const audioVideoConversionWorker = createWorker(WORKER_QUEUE_NAMES.AUDIO_VIDEO_CONVERSION, async (job) => {
    const { fileKey, userEmailId, fileName } = job.data;
    return await convertAudioVideo(fileKey, userEmailId, fileName);
});

const automaticSpeechRecognitionWorker = createWorker(WORKER_QUEUE_NAMES.AUTOMATIC_SPEECH_RECOGNITION, async (job) => {
    const { fileId } = job.data;
    return await performASR(fileId);
});

const LLMWorker = createWorker(WORKER_QUEUE_NAMES.LLM_MARKING, async (job) => {
    const { fileId, orderId } = job.data;
    return await markTranscript(orderId, fileId);
});

logger.info('All workers started');

export { audioVideoConversionWorker, automaticSpeechRecognitionWorker, LLMWorker };