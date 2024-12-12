import { CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";
import { NextResponse } from 'next/server';

import logger from '@/lib/logger';
import prisma from '@/lib/prisma';
import { s3Client } from '@/lib/s3Client';

export async function POST(req: Request) {
    const { sendBackData, parts } = await req.json();
    try {
        const sortedParts = parts.sort((a: { PartNumber: number }, b: { PartNumber: number }) => a.PartNumber - b.PartNumber);

        const command = new CompleteMultipartUploadCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: sendBackData.key,
            UploadId: sendBackData.uploadId,
            MultipartUpload: { Parts: sortedParts },
        });
        await s3Client.send(command);

        logger.info(`File uploaded successfully. File: ${sendBackData.key}`);

        await prisma.uploadSession.delete({
            where: {
                uploadId: sendBackData.uploadId
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error(`Error aborting multipart upload: ${error}. Key: ${sendBackData.key}, UploadId: ${sendBackData.uploadId}`);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}