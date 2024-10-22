import { NextResponse } from 'next/server';

import logger from '@/lib/logger';
import { redis } from '@/lib/redis';
import saveFileMetadata from '@/services/upload-service/save-file-metadata';

export async function POST(req: Request) {
    const metadata = await req.json();

    try {
        if (!metadata || !metadata.fileId) {
            return NextResponse.json({ message: 'Invalid metadata' }, { status: 400 });
        }

        await saveFileMetadata(metadata);

        await redis.publish('file-events', JSON.stringify({ status: 'METADATA_EXTRACTED', fileNameWithExtension: metadata?.fileNameWithExtension }));

        return NextResponse.json({ message: 'Metadata processed successfully' }, { status: 200 });
    } catch (error) {
        logger.error(`Error processing s3-metadata webhook for file ID ${metadata.fileId}:`, error);
        return NextResponse.json({ message: `Error processing s3-metadata webhook for file ID ${metadata.fileId}` }, { status: 500 });
    }
}