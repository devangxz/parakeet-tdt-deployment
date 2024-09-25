// TODO: Remove unnecessary logs
import axios from 'axios';
import { Queue } from 'bullmq';

import { redis } from '../lib/redis';
// import { TranscriptionService } from '../services/transcription.service';

const transcriptionQueue = new Queue('transcription', { connection: redis });

const RENDER_API_KEY = process.env.RENDER_API_KEY;
const RENDER_SERVICE_ID = process.env.RENDER_SERVICE_ID;
const RENDER_API_URL = `https://api.render.com/v1/services/${RENDER_SERVICE_ID}/scale`;

async function manageWorkers() {
  try {
    console.log("Running manageWorkers", redis.options.host);
    console.log("RENDER_API_URL:", RENDER_API_URL);
    console.log("RENDER_SERVICE_ID:", RENDER_SERVICE_ID);
    // const transcriptionService = new TranscriptionService();
    // const queue = transcriptionService.getQueue();
    const jobCounts = await transcriptionQueue.getJobCounts('waiting', 'active');
    const totalJobs = jobCounts.waiting + jobCounts.active;

    console.log(`Current queue status: ${totalJobs} total jobs (${jobCounts.waiting} waiting, ${jobCounts.active} active)`);

    // Get current number of instances
    const currentInstancesResponse = await axios.get(
      `https://api.render.com/v1/services/${RENDER_SERVICE_ID}`,
      { headers: { 'Authorization': `Bearer ${RENDER_API_KEY}` } }
    );
    const currentInstances = currentInstancesResponse.data.numInstances || 1;

    // Determine the number of workers needed
    const desiredWorkers = Math.min(Math.max(Math.ceil(totalJobs / 2), 1), 5);  // Min 1, Max 5 workers, 1 worker per 2 jobs

    if (desiredWorkers !== currentInstances) {
      console.log(`Scaling from ${currentInstances} to ${desiredWorkers} instances`);

      const response = await axios.post(RENDER_API_URL,
        { numInstances: desiredWorkers },
        {
          headers: {
            'Authorization': `Bearer ${RENDER_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`Scaled service to ${desiredWorkers} instances. Render API response:`, response.data);
    } else {
      console.log(`No scaling needed. Maintaining ${currentInstances} instances.`);
    }
  } catch (error) {
    console.error('Error managing workers:', error);
  } finally {
    console.log("Finished manageWorkers");
    process.exit(0);
  }
}

// Set a timeout to force exit if the job takes too long
const MAX_RUNTIME = 3 * 60 * 1000;  // 3 minutes
setTimeout(() => {
  console.error("Job timed out after 3 minutes. Force exiting.");
  process.exit(1);
}, MAX_RUNTIME);

manageWorkers();