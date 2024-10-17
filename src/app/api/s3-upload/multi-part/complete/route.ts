import { CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";
import { NextResponse } from 'next/server';

import { s3Client } from '@/lib/s3Client';
import { WORKER_QUEUE_NAMES, workerQueueService } from '@/services/worker-service';

export async function POST(req: Request) {
    try {
        const { sendBackData, parts } = await req.json();

        // Ensure parts are sorted by PartNumber
        const sortedParts = parts.sort((a: { PartNumber: number }, b: { PartNumber: number }) => a.PartNumber - b.PartNumber);

        const command = new CompleteMultipartUploadCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: sendBackData.key,
            UploadId: sendBackData.uploadId,
            MultipartUpload: { Parts: sortedParts },
        });
        await s3Client.send(command);

        // Create audio video conversion job
        await workerQueueService.createJob(WORKER_QUEUE_NAMES.AUDIO_VIDEO_CONVERSION, { fileKey: sendBackData.key });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in complete multipart upload:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}