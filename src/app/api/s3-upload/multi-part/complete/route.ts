import path from 'path';

import { CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";
import { NextResponse } from 'next/server';

import logger from '@/lib/logger';
import { s3Client } from '@/lib/s3Client';
import { WORKER_QUEUE_NAMES, workerQueueService } from '@/services/worker-service';

export async function POST(req: Request) {
    const { sendBackData, parts } = await req.json();
    try {
        const userToken = req.headers.get('x-user-token');
        const user = JSON.parse(userToken ?? '{}');

        // Ensure parts are sorted by PartNumber
        const sortedParts = parts.sort((a: { PartNumber: number }, b: { PartNumber: number }) => a.PartNumber - b.PartNumber);

        const command = new CompleteMultipartUploadCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: sendBackData.key,
            UploadId: sendBackData.uploadId,
            MultipartUpload: { Parts: sortedParts },
        });
        await s3Client.send(command);

        logger.info(`File uploaded successfully. File ID: ${sendBackData.key}`);

        const fileExtension = path.extname(sendBackData.key).toLowerCase();

        // Create audio video conversion job
        if (fileExtension !== '.docx') { // Check for remote legal docx files
            await workerQueueService.createJob(WORKER_QUEUE_NAMES.AUDIO_VIDEO_CONVERSION, { fileKey: sendBackData.key, userEmailId: user.email, fileName: sendBackData.fileName });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error(`Error aborting multipart upload: ${error}. Key: ${sendBackData.key}, UploadId: ${sendBackData.uploadId}`);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}