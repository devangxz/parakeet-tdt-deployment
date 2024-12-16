export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server';

import logger from '@/lib/logger';
import { getSignedURLFromS3 } from '@/utils/backend-helper';

export async function GET(req: NextRequest) {
    const fileId = new URL(req.url).searchParams.get('fileId') as string;
    try {
        const signedUrl = await getSignedURLFromS3(
            `${fileId}.mp3`,
            900,
            `${fileId}.mp3`
        );

        return NextResponse.json({ url: signedUrl });

    } catch (error) {
        logger.error(`Error generating signed URL for file ${fileId}: ${error}`);
        return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 });
    }
}
