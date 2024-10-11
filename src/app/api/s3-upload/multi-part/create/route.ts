import { CreateMultipartUploadCommand } from "@aws-sdk/client-s3";
import { NextResponse } from 'next/server';

import { s3Client } from '@/lib/s3Client';

export async function POST(req: Request) {
    try {
        const userToken = req.headers.get('x-user-token');
        const user = JSON.parse(userToken ?? '{}');

        if (!["CUSTOMER", "ADMIN"].includes(user.role)) {
            return NextResponse.json({ message: 'Action is not allowed' }, { status: 403 });
        }

        const { fileInfo } = await req.json();
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