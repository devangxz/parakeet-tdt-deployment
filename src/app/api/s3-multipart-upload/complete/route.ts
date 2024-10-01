import { CompleteMultipartUploadCommand, ListPartsCommand } from "@aws-sdk/client-s3";
import { NextResponse } from 'next/server';

import { s3Client } from '@/lib/s3Client';
import { WORKER_QUEUE_NAMES, workerQueueService,  } from '@/services/worker-service';

export async function POST(request: Request) {
    try {
        const { sendBackData } = await request.json();

        const listPartsCommand = new ListPartsCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: sendBackData.key,
            UploadId: sendBackData.uploadId,
        });
        const partsModel = await s3Client.send(listPartsCommand);

        const command = new CompleteMultipartUploadCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: sendBackData.key,
            UploadId: sendBackData.uploadId,
            MultipartUpload: {
                Parts: partsModel.Parts,
            },
        });
        await s3Client.send(command);

        // Create audio video conversion job
        const audioVideoConversionJobId = await workerQueueService.createJob(WORKER_QUEUE_NAMES.AUDIO_VIDEO_CONVERSION, { fileKey: sendBackData.key });
        return NextResponse.json({ success: true, audioVideoConversionJobId });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}