import { AbortMultipartUploadCommand } from "@aws-sdk/client-s3";
import { NextResponse } from 'next/server';

import logger from '@/lib/logger';
import { s3Client } from '@/lib/s3Client';

export async function POST(req: Request) {
    const { sendBackData } = await req.json();
    try {
        const command = new AbortMultipartUploadCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: sendBackData.key,
            UploadId: sendBackData.uploadId,
        });
        await s3Client.send(command);
        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error(`Error aborting multipart upload: ${error}. Key: ${sendBackData.key}, UploadId: ${sendBackData.uploadId}`);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}