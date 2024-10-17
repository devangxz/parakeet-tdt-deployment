import { FileStatus } from '@prisma/client';
import { NextResponse } from 'next/server';

import prisma from '@/lib/prisma';
import { redis } from '@/lib/redis';

interface Metadata {
    duration: number;
    bitRate?: string;
    sampleRate?: number;
    codecName: string;
    fileSize?: number;
    converted?: boolean;
    fileName?: string;
    fileId?: string;
    parentId?: string;
    fullPath?: string;
    risData?: string;
    userId: string;
};

export async function POST(req: Request) {
    try {
        const metadata = await req.json();

        if (!metadata || !metadata.fileId) {
            return NextResponse.json({ message: 'Invalid metadata' }, { status: 400 });
        }

        await saveFileInfoToDB(metadata);

        await redis.publish('file-events', JSON.stringify({ status: 'METADATA_EXTRACTED', fileNameWithExtension: metadata?.fileNameWithExtension }));

        return NextResponse.json({ message: 'Metadata processed successfully' }, { status: 200 });
    } catch (error) {
        console.error('Error processing s3-metadata webhook:', error);
        return NextResponse.json({ message: 'Error processing s3-metadata webhook' }, { status: 500 });
    }
}

async function saveFileInfoToDB(metadata: Metadata): Promise<string> {
    const fileSize = BigInt(Math.floor(metadata?.fileSize ?? 0));
    const duration = Math.floor(Number(metadata?.duration?.toFixed(2) ?? 0));
    const userId = Number(metadata?.userId);

    let isDuplicate = false;
    try {
        const existingFile = await prisma.file.findFirst({
            where: {
                filename: metadata?.fileName,
                userId: userId,
                NOT: {
                    fileId: metadata?.fileId,
                },
            },
        });
        isDuplicate = existingFile !== null;
    } catch (err) {
        console.error('Error checking for duplicate file:', (err as Error).message);
        throw new Error('Error checking for duplicate file');
    }

    const fileData = {
        userId,
        filename: metadata?.fileName ?? '',
        fileId: metadata?.fileId ?? '',
        duration: duration,
        bitRate: metadata?.bitRate ? Number(metadata.bitRate) : null,
        sampleRate: metadata?.sampleRate ? Number(metadata.sampleRate) : null,
        filesize: fileSize,
        uploadedBy: userId,
        fileStatus: isDuplicate ? FileStatus.DUPLICATE : FileStatus.NONE,
    };

    const newFile = await prisma.file.create({
        data: fileData,
    });

    if (isDuplicate) {
        const duplicateFiles = await prisma.file.findMany({
            where: {
                filename: metadata?.fileName,
                userId: userId,
                NOT: {
                    fileId: metadata?.fileId,
                },
            },
            select: {
                fileId: true,
            },
        });
        const duplicateFileIds = duplicateFiles.map((file: { fileId: string }) => file.fileId);
        return duplicateFileIds.join(',');
    }

    return newFile.fileId;
}