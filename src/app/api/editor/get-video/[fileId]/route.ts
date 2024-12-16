export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server';

import logger from '@/lib/logger';
import { fileExistsInS3, getSignedURLFromS3 } from '@/utils/backend-helper';

export async function GET(
    request: NextRequest,
    { params }: { params: { fileId: string } }
) {
    const fileId = params.fileId;
    const filename = `${fileId}.mp4`;
    try {
        if (!await fileExistsInS3(filename)) {
            return NextResponse.json({ error: 'Video file not found' }, { status: 404 });
        }
        const signedUrl = await getSignedURLFromS3(filename, 3600)
        return NextResponse.json({ signedUrl });

    } catch (error) {
        logger.error(`Error fetching signed url from S3: ${error}`);
        return NextResponse.json({ error: 'Error fetching signed url from S3' }, { status: 500 });
    }
}