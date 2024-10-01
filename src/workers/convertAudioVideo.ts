import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';

import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import ffprobePath from '@ffprobe-installer/ffprobe';
import ffmpeg from 'fluent-ffmpeg';
import { parseFile } from 'music-metadata';
import { v4 as uuidv4 } from 'uuid';

import prisma from '../lib/prisma';
import { s3Client } from '../lib/s3Client';
import { WorkerQueueService, WORKER_QUEUE_NAMES } from '../services/worker-service';

ffmpeg.setFfmpegPath(ffmpegPath.path);
ffmpeg.setFfprobePath(ffprobePath.path);

const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR);
}

export async function convertAudioVideo(fileKey: string): Promise<string> {
    console.log(`Processing file: ${fileKey}`);
    const tempFilePath = path.join(TEMP_DIR, path.basename(fileKey));
    const tempMp3Path = path.join(TEMP_DIR, `${path.parse(fileKey).name}.mp3`);

    try {
        await downloadFromS3(fileKey, tempFilePath);

        const needsConversion = path.extname(fileKey).toLowerCase() !== '.mp3';
        const finalPath = needsConversion ? tempMp3Path : tempFilePath;

        if (needsConversion) {
            await convertToMp3(tempFilePath, tempMp3Path);
            fs.unlinkSync(tempFilePath);
        }

        const metadata = await validateAndGetMetadata(finalPath);

        const mp3Key = `${path.parse(fileKey).name}.mp3`;
        await uploadToS3(finalPath, mp3Key);

        const fileRecord = await updateDatabase(fileKey, mp3Key, metadata);

        await triggerAsrJob(fileRecord.id, mp3Key);

        console.log(`Processing completed for file: ${fileKey}`);
        return fileRecord.fileId;
    } catch (error) {
        console.error(`Error processing file ${fileKey}:`, error);
        throw error;
    } finally {
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        if (fs.existsSync(tempMp3Path)) fs.unlinkSync(tempMp3Path);
    }
}

async function downloadFromS3(fileKey: string, tempFilePath: string): Promise<void> {
    const getObjectCommand = new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: fileKey,
    });
    const { Body } = await s3Client.send(getObjectCommand);
    const readableStream = Body as Readable;
    const writeStream = fs.createWriteStream(tempFilePath);
    await new Promise((resolve, reject) => {
        readableStream.pipe(writeStream)
            .on('finish', resolve)
            .on('error', reject);
    });
}

function convertToMp3(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .outputFormat('mp3')
            .on('end', () => resolve())
            .on('error', (err: Error) => reject(err))
            .save(outputPath);
    });
}

interface AudioMetadata {
    duration: number;
    bitRate?: number;
    sampleRate?: number;
}

async function validateAndGetMetadata(filePath: string): Promise<AudioMetadata> {
    try {
        const metadata = await parseFile(filePath);
        return {
            duration: Math.round(metadata.format.duration || 0),
            bitRate: metadata.format.bitrate,
            sampleRate: metadata.format.sampleRate,
        };
    } catch (err) {
        console.error('Error parsing file with music-metadata, falling back to ffprobe:', err);
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(filePath, (err: Error | null, metadata: ffmpeg.FfprobeData) => {
                if (err) return reject(err);
                resolve({
                    duration: Math.round(metadata.format.duration || 0),
                    bitRate: metadata.format.bit_rate,
                    sampleRate: metadata.streams[0].sample_rate,
                });
            });
        });
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

interface FileRecord {
    id: number;
    fileId: string;
    // Add other relevant fields here
}

async function updateDatabase(fileKey: string, mp3Key: string, metadata: AudioMetadata): Promise<FileRecord> {
    const fileId = uuidv4();
    return await prisma.file.create({
        data: {
            fileId: fileId,
            userId: 1, // You need to provide the correct userId here
            filename: path.basename(mp3Key),
            duration: metadata.duration,
            bitRate: metadata.bitRate,
            sampleRate: metadata.sampleRate,
            filesize: fs.statSync(path.join(TEMP_DIR, mp3Key)).size,
            uploadedBy: 1, // You need to provide the correct uploadedBy here
            fullPath: mp3Key,
            fileStatus: 'NONE',
        },
    });
}

async function triggerAsrJob(fileId: number, mp3Key: string): Promise<void> {
    await WorkerQueueService.prototype.createJob(WORKER_QUEUE_NAMES.AUTOMATIC_SPEECH_RECOGNITION, { fileId, mp3Key });
    console.log(`ASR job triggered for file ID ${fileId} with MP3 key ${mp3Key}`);
}