import { ListPartsCommand } from "@aws-sdk/client-s3";
import { Prisma } from '@prisma/client';
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

        const { fileName, fileSize, sourceType, sourceId } = await req.json();

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const baseWhereClause: Prisma.UploadSessionWhereInput = {
            userId: user.userId,
            createdAt: {
                gte: sevenDaysAgo
            },
            sourceInfo: {
                path: ['sourceType'],
                equals: sourceType
            }
        };

        const andConditions: Prisma.UploadSessionWhereInput[] = [
            {
                sourceInfo: {
                    path: ['fileName'],
                    equals: fileName
                }
            },
            {
                sourceInfo: {
                    path: ['fileSize'],
                    equals: fileSize
                }
            }
        ];

        if (sourceType !== 'local') {
            if (!sourceId) {
                return NextResponse.json({ message: 'sourceId is required for non-local sources' }, { status: 400 });
            }

            andConditions.push({
                sourceInfo: {
                    path: ['sourceId'],
                    equals: sourceId
                }
            });
        }

        const whereClause: Prisma.UploadSessionWhereInput = {
            ...baseWhereClause,
            AND: andConditions
        };

        const existingSession = await prisma.uploadSession.findFirst({
            where: whereClause
        });
        if (!existingSession) {
            return NextResponse.json({ exists: false });
        }

        try {
            const command = new ListPartsCommand({
                Bucket: process.env.AWS_S3_BUCKET_NAME,
                Key: existingSession.key,
                UploadId: existingSession.uploadId
            });
            const s3Response = await s3Client.send(command);

            return NextResponse.json({
                exists: true,
                uploadId: existingSession.uploadId,
                key: existingSession.key,
                parts: (s3Response.Parts ?? []).map(part => ({
                    ETag: part.ETag,
                    PartNumber: part.PartNumber
                }))
            });
        } catch (error) {
            await prisma.uploadSession.delete({
                where: { id: existingSession.id }
            });
            return NextResponse.json({ exists: false });
        }
    } catch (error) {
        logger.error(`Error checking upload session: ${error}`);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}