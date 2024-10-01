import { CreateMultipartUploadCommand } from "@aws-sdk/client-s3";
import { NextResponse } from 'next/server';

import { s3Client } from '@/lib/s3Client';

export async function POST(request: Request) {
    try {
        const { fileInfo } = await request.json();
        const fileName = fileInfo.name.split('/').pop();

        const command = new CreateMultipartUploadCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: fileName,
            ContentType: fileInfo.type,
        });
        const data = await s3Client.send(command);
        return NextResponse.json({
            uploadId: data.UploadId,
            key: data.Key,
        });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}