import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import { createWriteStream, promises as fs } from 'fs';
import https from 'https';
import { join, parse } from 'path';
import { pipeline } from 'stream/promises';
import { URL } from 'url';

import { S3Client, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client();

const WEBHOOK_URL = process.env.WEBHOOK_URL;

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

async function validateFileType(bucket, key) {
    try {
        const { ContentType, ContentLength } = await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        const fileExtension = '.' + key.split('.').pop().toLowerCase();
        if (!ALLOWED_FILE_TYPES.includes(ContentType) && !FILE_EXTENSIONS.includes(fileExtension)) {
            throw new Error(`Invalid file type: ${ContentType || fileExtension}`);
        }
        return { ContentType, ContentLength };
    } catch (error) {
        console.error(`Error validating file ${bucket}/${key}:`, error);
        throw error;
    }
}

export const handler = async (event) => {
    const startTime = Date.now();

    const bucketName = event.Records[0].s3.bucket.name;
    const objectKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));

    try {
        const headCommand = new HeadObjectCommand({ Bucket: bucketName, Key: objectKey });
        const headResponse = await s3Client.send(headCommand);
        const s3Metadata = headResponse.Metadata || {};

        if (s3Metadata.type === 'CONVERTED_FILE') {
            return {
                statusCode: 200,
                body: JSON.stringify({ message: `File ${objectKey} is a converted file.` }),
            };
        }

        const userId = s3Metadata.user_id;
        const fileName = s3Metadata.file_name;

        const fileExtension = objectKey.split('.').pop();
        const fileNameWithExtension = `${fileName}.${fileExtension}`;

        console.log(`Processing file - ${bucketName}/${objectKey} of user - ${userId}`);

        const { ContentType, ContentLength } = await validateFileType(bucketName, objectKey);
        const metadata = await getMetadata({ Bucket: bucketName, Key: objectKey });

        const endTime = Date.now();
        const processingTimeInSeconds = (endTime - startTime) / 1000;
        console.log(`Total processing time: ${processingTimeInSeconds} seconds`);

        const webhookData = {
            fileSize: ContentLength,
            duration: metadata.duration,
            codecName: metadata.codec_name,
            sampleRate: metadata.sample_rate,
            bitRate: metadata.bitrate,
            fileName,
            fileNameWithExtension,
            fileId: parse(objectKey).name,
            fileType: ContentType,
            timeTakenToExtractMetadata: processingTimeInSeconds,
            userId: userId
        };

        await sendWebhook(webhookData);

        return {
            statusCode: 200,
            body: JSON.stringify({ metadata: webhookData }),
        };
    } catch (error) {
        console.error('Error processing file:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};

const getMetadata = async (params) => {
    const { Body } = await s3Client.send(new GetObjectCommand(params));

    if (!Body || typeof Body.pipe !== 'function') {
        throw new Error('Invalid response body from S3');
    }

    const tempFilePath = join('/tmp', `${randomUUID()}-full`);

    try {
        await streamToFile(Body, tempFilePath);
        return await runFFprobe(tempFilePath);
    } finally {
        await fs.unlink(tempFilePath).catch(error => console.error('Error deleting temp file:', error));
    }
};

const streamToFile = async (readStream, filePath) => {
    const writeStream = createWriteStream(filePath);
    try {
        await pipeline(readStream, writeStream);
    } catch (error) {
        console.error('Error in streamToFile:', error);
        throw error;
    }
};

const runFFprobe = (filePath) => new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        filePath,
    ]);

    let output = '';
    let errorOutput = '';

    ffprobe.stdout.on('data', (data) => {
        output += data.toString();
    });

    ffprobe.stderr.on('data', (data) => {
        errorOutput += data.toString();
    });

    ffprobe.on('error', (error) => {
        console.error('ffprobe process error:', error);
        reject(new Error(`ffprobe process error: ${error.message}`));
    });

    ffprobe.on('close', (code) => {
        if (code !== 0) {
            reject(new Error(`ffprobe failed with code ${code}: ${errorOutput}`));
        } else {
            try {
                const parsedMetadata = JSON.parse(output);
                const format = parsedMetadata.format || {};
                const stream = (parsedMetadata.streams && parsedMetadata.streams[0]) || {};

                const result = {
                    duration: parseFloat(format.duration) || 0,
                    bitrate: parseInt(format.bit_rate) || 0,
                    codec_name: stream.codec_name || 'unknown',
                    sample_rate: parseInt(stream.sample_rate) || 0,
                };
                console.log('Parsed metadata:', JSON.stringify(result));
                resolve(result);
            } catch (err) {
                console.error('Error parsing ffprobe output:', err);
                reject(new Error(`Failed to parse ffprobe output: ${err.message}`));
            }
        }
    });
});

const sendWebhook = (data) => new Promise((resolve, reject) => {
    if (!WEBHOOK_URL) {
        console.error('WEBHOOK_URL is not set in environment variables');
        return resolve();
    }

    const url = new URL(WEBHOOK_URL);
    const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    };

    const req = https.request(options, (res) => {
        let responseBody = '';

        res.on('data', (chunk) => {
            responseBody += chunk;
        });

        res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                console.log('Webhook sent successfully. Response:', responseBody);
                resolve();
            } else {
                console.error(`HTTP error! status: ${res.statusCode}, body: ${responseBody}`);
                reject(new Error(`HTTP error! status: ${res.statusCode}`));
            }
        });
    });

    req.on('error', (error) => {
        console.error('Error sending webhook:', error);
        reject(error);
    });

    req.write(JSON.stringify(data));
    req.end();
});