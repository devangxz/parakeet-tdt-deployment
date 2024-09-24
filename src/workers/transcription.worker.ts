// TODO: Remove unnecessary logs
import axios from 'axios';
import { Worker } from 'bullmq';
import jwt from 'jsonwebtoken';

import { processFile } from './processFile';
import { redis } from '../lib/redis';

const WEBHOOK_URL = `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhook`;
const JWT_SECRET = process.env.JWT_SECRET;

// if (!JWT_SECRET) {
//   throw new Error('JWT_SECRET is not set');
// }

function generateJWT(payload: object) {
  return jwt.sign(payload, JWT_SECRET!, { expiresIn: '1h' });
}

export const worker = new Worker('transcription', async (job) => {
  const { jobId, fileKey } = job.data;

  try {
    console.log(`Processing job ${jobId} for file ${fileKey}`);
    const resultFileUrl = await processFile(fileKey);
    console.log(`Job ${jobId} completed. Result: ${resultFileUrl}`);
    return { status: 'completed', resultFileUrl };
  } catch (error) {
    console.error(`Error processing job ${jobId}:`, error);
    throw error;
  }
}, {
  connection: redis,
  concurrency: 1
});

worker.on('completed', async (job) => {
  const { jobId } = job.data;
  const { resultFileUrl } = job.returnvalue as { status: string; resultFileUrl: string };

  console.log(`Sending completion webhook for job ${jobId}`);

  try {
    const token = generateJWT({ jobId, status: 'completed' });
    const response = await axios.post(WEBHOOK_URL, {
      jobId,
      status: 'completed',
      resultFileUrl
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log(`Webhook sent for job ${jobId}. Response status:`, response.status);
  } catch (error) {
    console.error(`Failed to send completion webhook for job ${jobId}:`, error);
  }
});

worker.on('failed', async (job, error) => {
  const jobId = job?.data?.jobId ?? '';

  console.error(`Job ${jobId} failed:`, error);
  console.log(`Sending failure webhook for job ${jobId}`);

  try {
    const token = generateJWT({ jobId, status: 'failed' });
    const response = await axios.post(WEBHOOK_URL, {
      jobId,
      status: 'failed',
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
});

console.log('Transcription worker started');