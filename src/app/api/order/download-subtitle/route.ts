export const dynamic = 'force-dynamic'
import { FileTag } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import logger from '@/lib/logger';
import prisma from '@/lib/prisma';
import { downloadFromS3 } from '@/utils/backend-helper';
import getSRTVTT from '@/utils/getSRTVTT';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    const docType = searchParams.get('docType');

    logger.info(`--> downloadSubtitle ${fileId} ${docType}`);
    const ext = (docType as string).toLowerCase();

    if (!fileId) {
        return NextResponse.json({ error: 'File ID is required as a query parameter.' }, { status: 400 });
    }

    try {
        const fileVersion = await prisma.fileVersion.findFirst({
            where: {
                fileId: fileId,
                tag: FileTag.QC_DELIVERED,
            },
            select: {
                s3VersionId: true,
            },
        });

        if (!fileVersion?.s3VersionId) {
            logger.error(`File version not found for ${fileId}`);
            return NextResponse.json({ error: 'File version not found' }, { status: 404 });
        }

        const fileRecord = await prisma.file.findUnique({
            where: { fileId: fileId as string },
        });

        if (!fileRecord) {
            logger.info(`File not found ${fileId} ${docType}`);
            return NextResponse.json({ error: 'File not found.' }, { status: 404 });
        }

        const fileName = fileRecord.filename;

        const alignments = JSON.parse((await downloadFromS3(`${fileId}_ctms.json`)).toString());

        const subtitiles = getSRTVTT(alignments);

        if (!subtitiles) {
            return NextResponse.json({ error: 'Failed to generate subtitles' }, { status: 500 });
        }

        const { srt, vtt } = subtitiles;

        const subTitleContent =
            ext === 'vtt' ? vtt : srt;

        const blob = new Blob([subTitleContent], { type: ext === 'vtt' ? 'text/vtt' : 'application/x-subrip' });

        return new NextResponse(blob, {
            headers: {
                'Content-Disposition': `attachment; filename="${fileName}.${ext}"`,
                'Content-Type': ext === 'vtt' ? 'text/vtt' : 'application/x-subrip',
            },
        });
    } catch (err) {
        logger.error('Failed to process subtitle file', err);
        return NextResponse.json(
            { error: 'Failed to process subtitle file.', details: err },
            { status: 500 }
        );
    }
}
