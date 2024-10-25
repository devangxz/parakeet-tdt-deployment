import { AbortMultipartUploadCommand } from "@aws-sdk/client-s3";
import { NextResponse } from 'next/server';

import logger from '@/lib/logger';
import { s3Client } from '@/lib/s3Client';
import { requireCustomer } from '@/utils/checkRoles';

export async function POST(req: Request) {
    try {
        const userToken = req.headers.get('x-user-token');
        const user = JSON.parse(userToken ?? '{}');

        if (!requireCustomer(user)) {
            return NextResponse.json({ message: 'Action is not allowed' }, { status: 403 });
        }

        const { uploadId, key } = await req.json();

        const command = new AbortMultipartUploadCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: key,
            UploadId: uploadId,
        });

        await s3Client.send(command);
        logger.info(`Multipart upload aborted successfully. Key: ${key}, UploadId: ${uploadId}`);

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error(`Error aborting multipart upload: ${error}`);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}