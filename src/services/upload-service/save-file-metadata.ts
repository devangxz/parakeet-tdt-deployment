import { FileStatus } from '@prisma/client';

import prisma from '@/lib/prisma';

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

const saveFileMetadata = async (metadata: Metadata): Promise<void> => {
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

    await prisma.file.create({
        data: fileData,
    });

    if (isDuplicate) {
        await prisma.file.findMany({
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
    }
};

export default saveFileMetadata;