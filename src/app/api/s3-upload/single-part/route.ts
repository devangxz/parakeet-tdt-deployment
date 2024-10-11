import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from 'next/server';

import { s3Client } from '@/lib/s3Client';
import { WORKER_QUEUE_NAMES, workerQueueService } from '@/services/worker-service';

export async function POST(req: Request) {
    try {
        const userToken = req.headers.get('x-user-token');
        const user = JSON.parse(userToken ?? '{}');
    
        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const buffer = await file.arrayBuffer();
        const fileName = file.name;

        const uploadParams = {
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: fileName,
            Body: Buffer.from(buffer),
            ContentType: file.type,
        };

        const command = new PutObjectCommand(uploadParams);
        const result = await s3Client.send(command);

        // Create audio video conversion job
        await workerQueueService.createJob(WORKER_QUEUE_NAMES.AUDIO_VIDEO_CONVERSION, { fileKey: fileName, user });

        return NextResponse.json({ message: 'File uploaded successfully', result }, { status: 200 });
    } catch (error) {
        console.error('Error uploading file:', error);
        return NextResponse.json({ error: 'Error uploading file' }, { status: 500 });
    }
}