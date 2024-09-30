import { CompleteMultipartUploadCommand, ListPartsCommand } from "@aws-sdk/client-s3";
import { NextResponse } from 'next/server';

import { s3Client } from '@/lib/s3Client';
import { transcriptionService } from '@/services/transcription.service';

export async function POST(request: Request) {
    try {
        const { sendBackData } = await request.json();
        // List all parts
        const listPartsCommand = new ListPartsCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: sendBackData.key,
            UploadId: sendBackData.uploadId,
        });
        const partsModel = await s3Client.send(listPartsCommand);
        // Complete multipart upload
        const command = new CompleteMultipartUploadCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: sendBackData.key,
            UploadId: sendBackData.uploadId,
            MultipartUpload: {
                Parts: partsModel.Parts,
            },
        });
        await s3Client.send(command);

        // Create transcription job
        await transcriptionService.createJob(sendBackData.key);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}