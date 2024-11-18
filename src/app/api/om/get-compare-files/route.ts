import { FileTag } from '@prisma/client';
import { NextResponse } from 'next/server';

import logger from '@/lib/logger';
import prisma from '@/lib/prisma'
import { getFileVersionFromS3 } from '@/utils/backend-helper';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const reviewDiff = searchParams.get('reviewDiff') ?? ''
        const verificationDiff = searchParams.get('verificationDiff') ?? ''
        const fileId = searchParams.get('fileId') ?? ''

        const fileVersionMap = { asr: FileTag.AUTO, qc: FileTag.QC_DELIVERED, "customer-delivered": FileTag.CUSTOMER_DELIVERED, "customer-edit": FileTag.CUSTOMER_EDIT }

        if (!reviewDiff || !verificationDiff || !fileId) {
            logger.error('Missing reviewDiff, verificationDiff or fileId');
            return NextResponse.json(
                { success: false, message: 'Missing reviewDiff, verificationDiff or fileId' },
                { status: 400 }
            );
        }

        const reviewFileVersion = await prisma.fileVersion.findFirst({
            where: {
                fileId,
                tag: fileVersionMap[reviewDiff as keyof typeof fileVersionMap],
            },
            select: {
                s3VersionId: true
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        if (!reviewFileVersion || !reviewFileVersion.s3VersionId) {
            logger.error(`Review file version not found for ${fileId}`)
            return NextResponse.json({ success: false, message: 'Review file version not found' }, { status: 404 })
        }

        const verificationFileVersion = await prisma.fileVersion.findFirst({
            where: {
                fileId,
                tag: fileVersionMap[verificationDiff as keyof typeof fileVersionMap],
            },
            select: {
                s3VersionId: true
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        if (!verificationFileVersion || !verificationFileVersion.s3VersionId) {
            logger.error(`Verification file version not found for ${fileId}`)
            return NextResponse.json({ success: false, message: 'Verification file version not found' }, { status: 404 })
        }

        const reviewFile = (await getFileVersionFromS3(`${fileId}.txt`, reviewFileVersion?.s3VersionId)).toString();
        const verificationFile = (await getFileVersionFromS3(`${fileId}.txt`, verificationFileVersion?.s3VersionId)).toString();

        return NextResponse.json(
            { success: true, reviewFile, verificationFile },
            { status: 200 }
        );

    } catch (err) {
        logger.error(
            `An error occurred while fetching review and verification files: ${(err as Error).message}`
        );
        return NextResponse.json(
            { success: false, message: 'Failed to fetch review and verification files.' },
            { status: 500 }
        );
    }
}
