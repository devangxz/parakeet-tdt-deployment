import { FileTag } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import logger from '@/lib/logger';
import prisma from '@/lib/prisma';
import { getFileVersionFromS3 } from '@/utils/backend-helper';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const fileId = searchParams.get('fileId');
        const type = searchParams.get('type');
        const orgName = searchParams.get('orgName');
        const templateName = searchParams.get('templateName');

        if (!fileId || !type || !orgName || !templateName) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        logger.info(
            `--> downloadBlankDocx ${fileId} ${type} ${orgName} ${templateName}`,
        );

        const fileVersion = await prisma.fileVersion.findFirst({
            where: {
                fileId,
                tag: FileTag.CF_REV_SUBMITTED,
            },
            select: {
                s3VersionId: true,
            },
        });

        if (!fileVersion || !fileVersion.s3VersionId) {
            logger.error(`File version not found for ${fileId}`);
            return NextResponse.json({ error: 'File version not found' }, { status: 404 });
        }

        const fileBuffer = await getFileVersionFromS3(`${fileId}.docx`, fileVersion?.s3VersionId);

        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                'Content-Disposition': `attachment; filename="${fileId}.docx"`,
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            },
        });

    } catch (error) {
        logger.error(error);
        return NextResponse.json({ error: 'Failed to generate blank docx' }, { status: 500 });
    }
}
