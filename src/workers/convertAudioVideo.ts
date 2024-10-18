import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Readable } from 'stream';

import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import ffmpeg from 'fluent-ffmpeg';

import logger from '../lib/logger';
import prisma from '../lib/prisma';
import { s3Client } from '../lib/s3Client';
import { getAWSSesInstance } from '../lib/ses';

const ffmpegPath = process.env.FFMPEG_PATH;
const ffprobePath = process.env.FFPROBE_PATH;

if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);
if (ffprobePath) ffmpeg.setFfprobePath(ffprobePath);

const DURATION_DIFF = 0.5;
const ERROR_CODES = {
    DURATION_DIFF_ERROR: { code: 'DURATION_DIFF_ERROR', httpCode: 400 }
};

export async function convertAudioVideo(fileKey: string, userEmailId: string): Promise<string> {
    logger.info(`Processing file: ${fileKey}`);
    const startTime = Date.now();

    try {
        const { Body } = await s3Client.send(new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME!,
            Key: fileKey,
        }));

        const tempFilePath = path.join(os.tmpdir(), path.basename(fileKey));
        await saveStreamToFile(Body as Readable, tempFilePath);

        const fileId = (path.parse(fileKey)).name;
        await convertToMp3Mp4(tempFilePath, fileKey, fileId, userEmailId);

        fs.unlinkSync(tempFilePath);

        const endTime = Date.now();
        logger.info(`[${fileKey}] Processing completed. Total time: ${(endTime - startTime) / 1000} seconds`); return fileId;
    } catch (error) {
        logger.error(`Error processing file ${fileKey}: ${error}`);
        throw error;
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

async function convertToMp3Mp4(filePath: string, originalKey: string, fileId: string, userEmailId: string): Promise<void> {
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

                    await validateDuration(mp3Path, fileId, userEmailId);

                    // Clean up temp files
                    fs.unlinkSync(mp3Path);
                    if (isVideoFile) {
                        fs.unlinkSync(mp4Path);
                    }

                    resolve();
                } catch (err) {
                    logger.error(`Error in S3 operations: ${err}`);
                    reject(err);
                }
            })
            .catch((err) => {
                logger.error(`Error during conversion: ${err}`);
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

async function validateDuration(filePath: string, fileId: string, userEmailId: string): Promise<void> {
    const duration = await getMetadataWithFFmpeg(filePath);

    const file = await prisma.file.findUnique({
        where: { fileId: fileId },
        select: { duration: true }
    });

    if (file && Math.abs(file.duration - duration) > DURATION_DIFF) {
        const ses = getAWSSesInstance();

        const emailData = {
            userEmailId: userEmailId || '',
        }

        await ses.sendMail('DURATION_DIFFERENCE_FLAGGED', emailData, {});

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