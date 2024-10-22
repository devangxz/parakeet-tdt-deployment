import path from 'path';

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from 'next/server';

import logger from '@/lib/logger';
import { s3Client } from '@/lib/s3Client';
import { WORKER_QUEUE_NAMES, workerQueueService } from '@/services/worker-service';
import { requireCustomer } from '@/utils/checkRoles';

export async function POST(req: Request) {
    try {
        const userToken = req.headers.get('x-user-token');
        const user = JSON.parse(userToken ?? '{}');

        if (!requireCustomer(user)) {
            return NextResponse.json({ message: 'Action is not allowed' }, { status: 403 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const fileId = formData.get('fileId') as string;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const buffer = await file.arrayBuffer();

        const fileExtension = path.extname(file.name);
        const fileKey = fileId + fileExtension;

        const uploadParams = {
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: fileKey,
            Body: Buffer.from(buffer),
            ContentType: file.type,
            Metadata: {
                upload_environment: process.env.UPLOAD_ENVIRONMENT || 'STAGING',
                type: 'ORIGINAL_FILE',
                user_id: user?.userId?.toString(),
                team_user_id: user?.internalTeamUserId?.toString() || user?.userId?.toString(),
                file_name: path.parse(file.name).name
            }
        };

        const command = new PutObjectCommand(uploadParams);
        const result = await s3Client.send(command);

        logger.info(`File uploaded successfully. File ID: ${fileKey}`);

        // Create audio video conversion job
        if (fileExtension.toLowerCase() !== '.docx') { // Check for remote legal docx files
            await workerQueueService.createJob(WORKER_QUEUE_NAMES.AUDIO_VIDEO_CONVERSION, { fileKey, userEmailId: user.email });
        }

        return NextResponse.json({ message: 'File uploaded successfully', result }, { status: 200 });
    } catch (error) {
        logger.error(`Error aborting multipart upload: ${error}.`);
        return NextResponse.json({ error: 'Error uploading file' }, { status: 500 });
    }
}