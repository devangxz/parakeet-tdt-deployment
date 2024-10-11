import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Readable } from 'stream';

import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import ffprobePath from '@ffprobe-installer/ffprobe';
import { FileStatus } from '@prisma/client';
import axios from 'axios';
import ffmpeg from 'fluent-ffmpeg';

import { signJwtAccessToken } from '../lib/jwt';
import prisma from '../lib/prisma';
import { s3Client } from '../lib/s3Client';
import { WORKER_QUEUE_NAMES } from '../services/worker-service';

ffmpeg.setFfmpegPath(ffmpegPath.path);
ffmpeg.setFfprobePath(ffprobePath.path);

interface FFmpegMetadata {
    duration: number;
    codecName: string;
    sampleRate: number;
    bitRate: string;
    fileSize?: number;
    converted?: boolean;
    fileName?: string;
    fileId?: string;
};

interface AudioMetadata {
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
};

const ALLOWED_FILE_TYPES = [
    'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/x-ms-wma',
    'video/x-ms-wmv', 'video/x-msvideo', 'video/x-flv', 'video/mpeg',
    'video/mp4', 'audio/mp4', 'video/x-m4v', 'video/quicktime',
    'audio/ogg', 'video/ogg', 'video/webm', 'audio/aiff',
    'audio/x-aiff', 'audio/amr', 'video/3gpp', 'audio/3gpp',
    'video/mp2t', 'audio/aac', 'video/x-matroska', 'video/mxf',
    'audio/opus', 'audio/flac'
];

const FILE_EXTENSIONS = [
    '.mp3', '.wav', '.wma', '.wmv', '.avi', '.flv', '.mpg', '.mpeg',
    '.mp4', '.m4a', '.m4v', '.mov', '.ogg', '.webm', '.aif', '.aiff',
    '.amr', '.3gp', '.3ga', '.mts', '.ogv', '.aac', '.mkv', '.mxf',
    '.opus', '.flac'
];

const DURATION_DIFF = 0.5;
// const ERROR_CODES = {
//     DURATION_DIFF_ERROR: { code: 'DURATION_DIFF_ERROR', httpCode: 400 }
// };

const WEBHOOK_URL = `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhook`;

export async function convertAudioVideo(fileKey: string, user: Record<string, unknown>): Promise<string> {
    console.log(`Processing file: ${fileKey}`);
    const startTime = Date.now();

    try {
        console.time(`[${fileKey}] Total processing time`);

        console.time(`[${fileKey}] S3 download and validation`);
        const { Body, ContentType } = await s3Client.send(new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME!,
            Key: fileKey,
        }));

        await validateFileType(ContentType, fileKey);
        console.timeEnd(`[${fileKey}] S3 download and validation`);

        const tempFilePath = path.join(os.tmpdir(), path.basename(fileKey));
        await saveStreamToFile(Body as Readable, tempFilePath);

        console.time(`[${fileKey}] Metadata extraction and DB save`);
        const metadata = await getMetadataWithFFmpeg(tempFilePath);
        console.timeEnd(`[${fileKey}] Metadata extraction`);
        const parsedPath = path.parse(fileKey);

        Object.assign(metadata, {
            fileSize: fs.statSync(tempFilePath).size,
            converted: parsedPath.ext.toLowerCase() !== '.mp3',
            fileName: parsedPath.name,
            fileId: parsedPath.name
            // fullpath: file?.webkitRelativePath;
            // parent_id: parent_id;
        });

        console.time(`[${fileKey}] DB save and webhook send`);
        const { fileId } = await saveFileInfoToDB(metadata, user);

        try {
            const queueName = WORKER_QUEUE_NAMES.AUDIO_VIDEO_CONVERSION;
            const token = signJwtAccessToken({ status: 'METADATA_EXTRACTED', queueName });

            await axios.post(WEBHOOK_URL, {
                status: 'METADATA_EXTRACTED',
                queueName,
                result: {
                    fileName: fileKey
                }
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        } catch (error) {
            console.error(`Failed to send completion webhook for job:`, error);
        }
        console.timeEnd(`[${fileKey}] DB save and webhook send`);

        console.time(`[${fileKey}] File conversion and S3 operations`);
        await convertToMp3Mp4(tempFilePath, fileKey, fileId);
        console.timeEnd(`[${fileKey}] File conversion and S3 operations`);

        fs.unlinkSync(tempFilePath);

        console.timeEnd(`[${fileKey}] Total processing time`);
        const endTime = Date.now();
        console.log(`[${fileKey}] Processing completed. Total time: ${(endTime - startTime) / 1000} seconds`);
        return fileId;
    } catch (error) {
        console.error(`Error processing file ${fileKey}:`, error);
        throw error;
    }
}

async function validateFileType(contentType: string | undefined, fileName: string): Promise<void> {
    if (!contentType) {
        throw new Error('Content-Type is missing');
    }

    const fileExtension = path.extname(fileName).toLowerCase();

    if (!ALLOWED_FILE_TYPES.includes(contentType) && !FILE_EXTENSIONS.includes(fileExtension)) {
        throw new Error(`Invalid file type. Allowed types are: ${FILE_EXTENSIONS.join(', ')}`);
    }
}

async function saveStreamToFile(stream: Readable, filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const writeStream = fs.createWriteStream(filePath);
        stream.pipe(writeStream);
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
    });
}

async function getMetadataWithFFmpeg(filePath: string): Promise<FFmpegMetadata> {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err: Error | null, metadata: ffmpeg.FfprobeData) => {
            if (err) {
                return reject(new Error('Invalid file'));
            }

            const duration = metadata.format.duration as number;
            const codecName = metadata.streams[0]?.codec_name as string;
            const sampleRate =
                metadata.streams[0]?.sample_rate || metadata.streams[1]?.sample_rate;
            const bitRate = metadata.streams[0]?.bit_rate as string;

            // Validate that all necessary metadata fields are present
            if (!duration || !codecName || !sampleRate || !bitRate) {
                return reject(new Error('Invalid file'));
            }           

            resolve({ duration, codecName, sampleRate, bitRate });
        });
    });
}

async function saveFileInfoToDB(metadata: AudioMetadata, user: Record<string, unknown>): Promise<{ type: string; fileId: string }> {
    const fileSize = Math.floor(metadata?.fileSize ?? 0);
    const duration = Math.floor(Number(metadata?.duration?.toFixed(2) ?? 0));
    const userId = Number(user?.userId);

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
        parentId: metadata?.parentId ? Number(metadata.parentId) : null,
        fullPath: metadata?.fullPath ?? null,
        customFormattingDetails: metadata?.risData ? JSON.parse(JSON.stringify(metadata.risData)) : null,
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
        return { type: 'Duplicate', fileId: duplicateFileIds.join(',') };
    }

    return { type: 'file', fileId: newFile.fileId };
}

async function convertToMp3Mp4(filePath: string, originalKey: string, fileId: string): Promise<void> {
    const fileExt = path.extname(originalKey).toLowerCase();
    const baseName = path.parse(originalKey).name;
    const mp3Key = `${baseName}.mp3`;
    const mp4Key = `${baseName}.mp4`;
    const mp3Path = path.join(os.tmpdir(), mp3Key);
    const mp4Path = path.join(os.tmpdir(), mp4Key);

    const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm', '.mpg', '.mpeg', '.m4v', '.3gp', '.mts', '.mp2t', '.ogv', '.mxf'];

    const isVideoFile = videoExtensions.includes(fileExt);

    if (fileExt === '.mp3') return;

    if (fileExt === '.mp4') {
        await convertFile(filePath, mp3Path, 'mp3');
        await uploadToS3(mp3Path, mp3Key);
        return;
    }

    return new Promise((resolve, reject) => {
        const conversionPromises = [];

        // Convert to MP3
        conversionPromises.push(convertFile(filePath, mp3Path, 'mp3'));

        // Convert to MP4 if it's a video file
        if (isVideoFile) {
            conversionPromises.push(convertFile(filePath, mp4Path, 'mp4'));
        }

        Promise.all(conversionPromises)
            .then(async () => {
                try {
                    await uploadToS3(mp3Path, mp3Key);

                    if (isVideoFile) {
                        await uploadToS3(mp4Path, mp4Key);
                    }

                    // Delete original file if it's not mp3 or mp4
                    if (fileExt !== '.mp3' && fileExt !== '.mp4') {
                        await deleteFromS3(originalKey);
                    }

                    await validateDuration(mp3Path, fileId);

                    // Clean up temp files
                    fs.unlinkSync(mp3Path);
                    if (isVideoFile) {
                        fs.unlinkSync(mp4Path);
                    }

                    resolve();
                } catch (err) {
                    console.error('Error in S3 operations:', err);
                    reject(err);
                }
            })
            .catch((err) => {
                console.error('Error during conversion:', err);
                reject(err);
            });
    });
}

function convertFile(input: string, output: string, format: 'mp3' | 'mp4'): Promise<void> {
    return new Promise((resolve, reject) => {
        let command = ffmpeg(input).outputFormat(format);

        if (format === 'mp4') {
            command = command.videoCodec('libx264').audioCodec('aac');
        }

        command
            .on('end', () => resolve())
            .on('error', (err) => reject(err))
            .save(output);
    });
}

async function validateDuration(filePath: string, fileId: string): Promise<void> {
    const { duration } = await getMetadataWithFFmpeg(filePath);

    const file = await prisma.file.findUnique({
        where: { fileId: fileId },
        select: { duration: true }
    });

    if (file && Math.abs(file.duration - duration) > DURATION_DIFF) {
        // await MailService.sendMail('DURATION_DIFFERENCE_FLAGGED');
        // logger.info(
        //     `File flagged for duration difference::${ERROR_CODES.DURATION_DIFF_ERROR.code}::${ERROR_CODES.DURATION_DIFF_ERROR.httpCode}`
        // );
    }
}

async function uploadToS3(filePath: string, key: string): Promise<void> {
    const fileContent = fs.readFileSync(filePath);
    const putObjectCommand = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: key,
        Body: fileContent,
    });
    await s3Client.send(putObjectCommand);
}

async function deleteFromS3(key: string): Promise<void> {
    const deleteObjectCommand = new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: key,
    });
    await s3Client.send(deleteObjectCommand);
}