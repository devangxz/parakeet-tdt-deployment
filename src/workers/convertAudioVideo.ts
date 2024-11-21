import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import { promisify } from 'util';

import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import ffmpeg from 'fluent-ffmpeg';

import { DURATION_DIFF, ERROR_CODES } from '../constants';
import logger from '../lib/logger';
import prisma from '../lib/prisma';
import { s3Client } from '../lib/s3Client';
import { getAWSSesInstance } from '../lib/ses';

const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);
const access = promisify(fs.access);

const ffmpegPath = process.env.FFMPEG_PATH;
const ffprobePath = process.env.FFPROBE_PATH;

if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);
if (ffprobePath) ffmpeg.setFfprobePath(ffprobePath);

const PERSISTENT_STORAGE_PATH = '/data/files';
const CONVERSION_RETRY_CONFIG = {
    maxAttempts: 3,
    initialDelayMs: 1000,
    backoffMultiplier: 2
};

const VIDEO_EXTENSIONS = [
    '.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv',
    '.webm', '.mpg', '.mpeg', '.m4v', '.3gp',
    '.mts', '.3ga', '.ogv', '.mxf'
];

class PersistentStorageHandler {
    private persistentPath: string;

    constructor() {
        this.persistentPath = PERSISTENT_STORAGE_PATH;
        this.initStorage();
    }

    private async initStorage() {
        try {
            await access(this.persistentPath);
        } catch {
            await mkdir(this.persistentPath, { recursive: true });
        }
    }

    private async checkStorageSpace(): Promise<boolean> {
        return new Promise((resolve) => {
            fs.statfs(this.persistentPath, (err, stats) => {
                if (err) {
                    logger.error('Error checking storage space:', err);
                    resolve(false);
                    return;
                }

                const availableGB = (stats.bavail * stats.bsize) / (1024 * 1024 * 1024);
                resolve(availableGB > 1);
            });
        });
    }

    public async saveStreamToStorage(stream: Readable, fileName: string): Promise<string> {
        const hasSpace = await this.checkStorageSpace();
        if (!hasSpace) {
            throw new Error('Insufficient storage space');
        }

        const filePath = this.getFilePath(fileName);

        return new Promise((resolve, reject) => {
            const writeStream = fs.createWriteStream(filePath);

            stream.pipe(writeStream);

            writeStream.on('finish', () => resolve(filePath));
            writeStream.on('error', async (error) => {
                await unlink(filePath).catch(() => { });
                reject(error);
            });
        });
    }

    public async deleteFile(filePath: string): Promise<void> {
        try {
            const exists = await this.fileExists(filePath);
            if (exists) {
                await unlink(filePath);
                logger.info(`Successfully deleted file: ${filePath}`);
            } else {
                logger.debug(`File does not exist, skipping deletion: ${filePath}`);
            }
        } catch (error) {
            logger.error(`Error deleting file ${filePath}:`, error);
            throw error;
        }
    }

    public getFilePath(fileName: string): string {
        return path.join(this.persistentPath, fileName);
    }

    private async fileExists(filePath: string): Promise<boolean> {
        try {
            await access(filePath, fs.constants.F_OK);
            return true;
        } catch {
            return false;
        }
    }
}

const storageHandler = new PersistentStorageHandler();

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const calculateBackoffDelay = (attempt: number): number =>
    CONVERSION_RETRY_CONFIG.initialDelayMs * Math.pow(CONVERSION_RETRY_CONFIG.backoffMultiplier, attempt - 1);

export async function convertAudioVideo(fileKey: string, userEmailId: string, fileName: string): Promise<string> {
    logger.info(`Starting processing for file: ${fileKey}`);
    const startTime = Date.now();
    let downloadedFilePath: string | null = null;

    try {
        const { Body } = await s3Client.send(new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME!,
            Key: fileKey,
        }));

        downloadedFilePath = await storageHandler.saveStreamToStorage(
            Body as Readable,
            path.basename(fileKey)
        );

        const fileId = path.parse(fileKey).name;
        await convertToMp3Mp4(downloadedFilePath, fileKey, fileId, userEmailId, fileName);

        const endTime = Date.now();
        logger.info(`[${fileKey}] Processing completed. Total time: ${(endTime - startTime) / 1000} seconds`);
        return fileId;
    } catch (error) {
        logger.error(`Error processing file ${fileKey}: ${error}`);
        throw error;
    } finally {
        if (downloadedFilePath) {
            try {
                await storageHandler.deleteFile(downloadedFilePath);
            } catch (cleanupError) {
                logger.error(`Error cleaning up downloaded file ${downloadedFilePath}:`, cleanupError);
            }
        }
    }
}

async function getMetadataWithFFmpeg(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err: Error | null, metadata: ffmpeg.FfprobeData) => {
            if (err) {
                return reject(new Error('Invalid file'));
            }

            const duration = metadata.format.duration as number;
            if (!duration) {
                return reject(new Error('Duration not found'));
            }

            resolve(duration);
        });
    });
}

async function convertFile(input: string, output: string, format: 'mp3' | 'mp4', fileId: string, fileName: string): Promise<void> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= CONVERSION_RETRY_CONFIG.maxAttempts; attempt++) {
        try {
            await new Promise<void>((resolve, reject) => {
                let command = ffmpeg(input).outputFormat(format);

                if (format === 'mp4') {
                    command = command
                        .videoCodec('libx264')
                        .audioCodec('aac')
                        .outputOptions('-preset', 'medium')
                        .outputOptions('-movflags', '+faststart');
                }

                command
                    .on('start', () => {
                        logger.info(`Starting ${format} conversion attempt ${attempt}`);
                    })
                    .on('end', () => {
                        logger.info(`${format} conversion attempt ${attempt} completed successfully`);
                        resolve();
                    })
                    .on('error', (err: Error) => {
                        logger.error(`${format} conversion attempt ${attempt} failed: ${err.message}`);
                        reject(err);
                    })
                    .save(output);
            });

            if (attempt > 1) {
                logger.info(`File conversion to ${format} succeeded on attempt ${attempt}`);
            }
            return;

        } catch (error) {
            lastError = error as Error;

            if (attempt === CONVERSION_RETRY_CONFIG.maxAttempts) {
                const finalError = new Error(
                    `File conversion to ${format} failed after ${CONVERSION_RETRY_CONFIG.maxAttempts} attempts. Final error: ${error}`
                );
                logger.error(finalError.message);

                const ses = getAWSSesInstance();
                const emailData = { userEmailId: '' };
                const templateData = {
                    file_id: fileId,
                    file_name: fileName,
                };

                await ses.sendMail('CONVERSION_ERROR', emailData, templateData);
                throw finalError;
            }

            const backoffDelay = calculateBackoffDelay(attempt);
            logger.warn(
                `File conversion to ${format} attempt ${attempt} failed. ` +
                `Retrying in ${backoffDelay / 1000} seconds. Error: ${error}`
            );
            await delay(backoffDelay);
        }
    }

    throw lastError;
}

async function convertToMp3Mp4(filePath: string, originalKey: string, fileId: string, userEmailId: string, fileName: string): Promise<void> {
    const fileExt = path.extname(originalKey).toLowerCase();
    const baseName = path.parse(originalKey).name;
    const mp3Key = `${baseName}.mp3`;
    const mp4Key = `${baseName}.mp4`;
    const mp3Path = storageHandler.getFilePath(mp3Key);
    const mp4Path = storageHandler.getFilePath(mp4Key);

    const isVideoFile = VIDEO_EXTENSIONS.includes(fileExt);
    let mp3Created = false;
    let mp4Created = false;
    let originalDeleted = false;

    if (fileExt === '.mp3') return;

    try {
        if (fileExt === '.mp4') {
            await convertFile(filePath, mp3Path, 'mp3', originalKey, fileName);
            mp3Created = true;
            await uploadToS3(mp3Path, mp3Key);
            return;
        }

        const conversionPromises = [];
        conversionPromises.push(
            convertFile(filePath, mp3Path, 'mp3', originalKey, fileName)
                .then(() => { mp3Created = true; })
        );

        if (isVideoFile) {
            conversionPromises.push(
                convertFile(filePath, mp4Path, 'mp4', originalKey, fileName)
                    .then(() => { mp4Created = true; })
            );
        }

        await Promise.all(conversionPromises);

        if (mp3Created) {
            await uploadToS3(mp3Path, mp3Key);
        }

        if (mp4Created) {
            await uploadToS3(mp4Path, mp4Key);
        }

        if (fileExt !== '.mp3' && fileExt !== '.mp4') {
            await deleteFromS3(originalKey);
            originalDeleted = true;
        }

        try {
            await validateDuration(mp3Path, fileId, userEmailId);
        } catch (durationError) {
            logger.error(`Duration validation error for ${fileId}:`, durationError);
        }

    } catch (error) {
        if (!originalDeleted) {
            try {
                if (mp3Created) await deleteFromS3(mp3Key);
                if (mp4Created) await deleteFromS3(mp4Key);
            } catch (cleanupError) {
                logger.error(`Error cleaning up S3 after conversion failure:`, cleanupError);
            }
        }
        throw error;
    } finally {
        try {
            if (mp3Created) await storageHandler.deleteFile(mp3Path);
            if (mp4Created) await storageHandler.deleteFile(mp4Path);
        } catch (cleanupError) {
            logger.error(`Error during local file cleanup:`, cleanupError);
        }
    }
}

async function validateDuration(filePath: string, fileId: string, userEmailId: string): Promise<void> {
    const duration = await getMetadataWithFFmpeg(filePath);

    const file = await prisma.file.findUnique({
        where: { fileId: fileId },
        select: { duration: true }
    });

    if (file && Math.abs(file.duration - duration) > DURATION_DIFF) {
        const ses = getAWSSesInstance();
        const emailData = { userEmailId };
        const templateData = {};

        await ses.sendMail('DURATION_DIFFERENCE_FLAGGED', emailData, templateData);

        logger.info(
            `${fileId} - File flagged for duration difference::${ERROR_CODES.DURATION_DIFF_ERROR.code}::${ERROR_CODES.DURATION_DIFF_ERROR.httpCode}`
        );
    }
}

async function uploadToS3(filePath: string, key: string): Promise<void> {
    const fileContent = fs.readFileSync(filePath);
    const putObjectCommand = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: key,
        Body: fileContent,
        Metadata: {
            type: 'CONVERTED_FILE',
        }
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