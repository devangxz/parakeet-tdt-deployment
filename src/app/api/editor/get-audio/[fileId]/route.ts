import { Readable } from 'stream';

import { GetObjectCommand } from '@aws-sdk/client-s3';
import { NextRequest, NextResponse } from 'next/server';

import logger from '@/lib/logger';
import s3Client from '@/lib/s3-client';

export async function GET(
    request: NextRequest,
    { params }: { params: { fileId: string } }
) {
    const fileId = params.fileId;
    const filename = `${fileId}.mp3`;
    const range = request.headers.get('range');

    try {
        const s3Params: { Bucket: string; Key: string; Range?: string } = {
            Bucket: process.env.AWS_S3_BUCKET_NAME!,
            Key: filename,
        };

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : undefined;

            s3Params.Range = `bytes=${start}-${end ? end : ''}`;
        }

        const command = new GetObjectCommand(s3Params);
        const { Body, ContentLength, ContentRange } = await s3Client.send(command);

        if (Body instanceof Readable) {
            const headers: Record<string, string> = {
                'Content-Type': 'audio/mpeg',
                'Content-Disposition': `inline; filename="${filename}"`,
                'Accept-Ranges': 'bytes',
            };

            if (range) {
                headers['Content-Range'] = ContentRange ?? '';
                headers['Content-Length'] = ContentLength?.toString() ?? '';
                return new NextResponse(Body as unknown as ReadableStream, { status: 206, headers });
            } else {
                return new NextResponse(Body as unknown as ReadableStream, { headers });
            }
        } else {
            throw new Error('S3 object body is not a readable stream');
        }
    } catch (error) {
        logger.error(`Error streaming file from S3: ${error}`);
        return NextResponse.json({ error: 'Failed to stream audio file' }, { status: 500 });
    }
}