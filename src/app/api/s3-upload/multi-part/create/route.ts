import path from 'path';

import { CreateMultipartUploadCommand } from "@aws-sdk/client-s3";
import { NextResponse } from 'next/server';

import logger from '@/lib/logger';
import prisma from '@/lib/prisma';
import { s3Client } from '@/lib/s3Client';
import { requireCustomer } from '@/utils/checkRoles';

export async function POST(req: Request) {
    try {
        const userToken = req.headers.get('x-user-token');
        const user = JSON.parse(userToken ?? '{}');

        if (!requireCustomer(user)) {
            return NextResponse.json({ message: 'Action is not allowed' }, { status: 403 });
        }

        const { fileInfo } = await req.json();

        const fileName = path.parse(fileInfo.originalName).name;
        const fileExtension = path.extname(fileInfo.originalName);
        const fileKey = fileExtension.toLowerCase() === '.docx'
            ? fileInfo.fileId + fileExtension
            : `${fileName}_${fileInfo.fileId}${fileExtension}`;

        const command = new CreateMultipartUploadCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: fileKey,
            ContentType: fileInfo.type,
            Metadata: {
                upload_environment: process.env.UPLOAD_ENVIRONMENT || 'STAGING',
                type: 'ORIGINAL_FILE',
                user_id: user?.userId?.toString(),
                team_user_id: user?.internalTeamUserId?.toString() || user?.userId?.toString(),
                file_id: fileInfo.fileId,
                file_name: path.parse(fileInfo.originalName).name
            }
        });
        const data = await s3Client.send(command);

        await prisma.uploadSession.create({
            data: {
                uploadId: data.UploadId!,
                key: data.Key!,
                userId: user.userId,
                sourceInfo: {
                    sourceType: fileInfo.source,
                    sourceId: fileInfo.sourceId || null,
                    fileName: fileInfo.originalName,
                    fileSize: fileInfo.size
                }
            }
        });

        return NextResponse.json({
            uploadId: data.UploadId,
            key: data.Key,
        });
    } catch (error) {
        logger.error(`Error aborting multipart upload: ${error}.`);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}