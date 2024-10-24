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

        if (metadata.status === 'success') {
            await saveFileMetadata(metadata);
        }
        
        await redis.publish('file-events', JSON.stringify({ type: 'METADATA_EXTRACTION', file: { status: metadata?.status, fileNameWithExtension: metadata?.fileNameWithExtension } }));

        return new Response(null, { status: 200 });
    } catch (error) {
        logger.error(`Error processing s3-metadata webhook for file ID ${metadata.fileId}:`, error);
        return NextResponse.json({ message: `Error processing s3-metadata webhook for file ID ${metadata.fileId}` }, { status: 500 });
    }
}