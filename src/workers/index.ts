import axios from 'axios';
import { Worker, Job } from 'bullmq';

import { convertAudioVideo } from './convertAudioVideo';
import { performASR } from './performASR';
import { performLLMMarking } from './performLLMMarking';
import { signJwtAccessToken } from '../lib/jwt';
import { redis } from '../lib/redis';
import { WORKER_QUEUE_NAMES, QueueName } from '../services/worker-service';

const WEBHOOK_URL = `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhook`;

const createWorker = (queueName: QueueName, processFunction: (job: Job) => Promise<unknown>) => new Worker(queueName, async (job) => {
    const { jobId } = job.data;
    console.log(`Processing ${queueName} job ${jobId}`);
    try {
        const result = await processFunction(job);
        console.log(`${queueName} job ${jobId} completed. Result:`, result);
        return { status: 'completed', result };
    } catch (error) {
        console.error(`Error processing ${queueName} job ${jobId}:`, error);
        throw error;
    }
}, {
    connection: redis,
    concurrency: 1
});

// Create workers for each queue
const audioVideoConversionWorker = createWorker(WORKER_QUEUE_NAMES.AUDIO_VIDEO_CONVERSION, async (job) => {
    const { fileKey } = job.data;
    return await convertAudioVideo(fileKey);
});

const automaticSpeechRecognitionWorker = createWorker(WORKER_QUEUE_NAMES.AUTOMATIC_SPEECH_RECOGNITION, async (job) => {
    const { fileKey } = job.data;
    return await performASR(fileKey);
});

const llmMarkingWorker = createWorker(WORKER_QUEUE_NAMES.LLM_MARKING, async (job) => {
    const { fileKey } = job.data;
    return await performLLMMarking(fileKey);
});

// Generic completion handler
const handleCompletion = async (job: Job) => {
    const { jobId, queueName } = job.data;
    const result = job.returnvalue;

    console.log(`Sending completion webhook for job ${jobId}`);

    try {
        const token = signJwtAccessToken({ jobId, status: 'completed', queueName });
        const response = await axios.post(WEBHOOK_URL, {
            jobId,
            status: 'completed',
            queueName,
            result
        }, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        console.log(`Webhook sent for job ${jobId}. Response status:`, response.status);
    } catch (error) {
        console.error(`Failed to send completion webhook for job ${jobId}:`, error);
    }
};

// Generic failure handler
const handleFailure = async (job: Job | undefined, error: Error) => {
    const jobId = job?.data?.jobId ?? '';
    const queueName = job?.data?.queueName as QueueName;

    console.error(`Job ${jobId} failed:`, error);
    console.log(`Sending failure webhook for job ${jobId}`);

    try {
        const token = signJwtAccessToken({ jobId, status: 'failed', queueName });
        const response = await axios.post(WEBHOOK_URL, {
            jobId,
            status: 'failed',
            queueName,
            error: error.message
        }, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        console.log(`Webhook sent for job ${jobId}. Response status:`, response.status);
    } catch (webhookError) {
        console.error(`Failed to send failure webhook for job ${jobId}:`, webhookError);
    }
};

// Attach event handlers to each worker
[audioVideoConversionWorker, automaticSpeechRecognitionWorker, llmMarkingWorker].forEach(worker => {
    worker.on('completed', handleCompletion);
    worker.on('failed', handleFailure);
});

console.log('All workers started');

export { audioVideoConversionWorker, automaticSpeechRecognitionWorker, llmMarkingWorker };