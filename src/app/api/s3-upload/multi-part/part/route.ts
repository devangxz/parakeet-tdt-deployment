import { UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from 'next/server';

import logger from "@/lib/logger";
import { s3Client } from '@/lib/s3Client';

export async function POST(req: Request) {
    const { sendBackData, partNumber, contentLength } = await req.json();
    try {
        const command = new UploadPartCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: sendBackData.key,
            UploadId: sendBackData.uploadId,
            PartNumber: partNumber,
            ContentLength: contentLength,
        });
        const url = await getSignedUrl(s3Client, command, { expiresIn: 48 * 3600 });
        return NextResponse.json({ url });
    } catch (error) {
        logger.error(`Error aborting multipart upload: ${error}. Key: ${sendBackData.key}, UploadId: ${sendBackData.uploadId}`);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}