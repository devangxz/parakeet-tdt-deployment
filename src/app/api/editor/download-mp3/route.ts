export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server';

import logger from '@/lib/logger';
import { downloadFromS3 } from '@/utils/backend-helper';

export async function GET(req: NextRequest) {
    const fileId = new URL(req.url).searchParams.get('fileId') as string;
    try {

        const mp3 = await downloadFromS3(`${fileId}.mp3`);

        if (!mp3) {
            logger.error(`File version not found for ${fileId}`);
            return NextResponse.json({ error: 'File version not found' }, { status: 404 });
        }

        return new NextResponse(mp3, {
            status: 200,
            headers: {
                'Content-Disposition': `attachment; filename="${fileId}.mp3"`,
                'Content-Type': 'audio/mpeg',
            },
        });

    } catch (error) {
        logger.error(`error downloading file for file ${fileId}`);
        return NextResponse.json({ error: 'Failed to generate blank docx' }, { status: 500 });
    }
}
