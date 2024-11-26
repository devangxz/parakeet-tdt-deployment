import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import { createWriteStream, promises as fs } from 'fs';
import https from 'https';
import { join, parse } from 'path';
import { pipeline } from 'stream/promises';
import { URL } from 'url';

import { S3Client, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

const config = {
    webhookUrls: {
        PROD: process.env.PROD_WEBHOOK_URL,
        STAGING: process.env.STAGING_WEBHOOK_URL,
        DEV: process.env.DEV_WEBHOOK_URL,
        RAJIV: process.env.RAJIV_WEBHOOK_URL,
        DAYA: process.env.DAYA_WEBHOOK_URL,
        TARUN: process.env.TARUN_WEBHOOK_URL,
        PRASAD: process.env.PRASAD_WEBHOOK_URL,
    },
    allowedFileTypes: {
        // Audio formats
        '.mp3': ['audio/mpeg'],
        '.wav': ['audio/wav', 'audio/x-wav'],
        '.wma': ['audio/x-ms-wma'],
        '.aac': ['audio/aac'],
        '.flac': ['audio/flac'],
        '.ogg': ['audio/ogg'],
        '.aif': ['audio/aiff', 'audio/x-aiff'],
        '.aiff': ['audio/aiff', 'audio/x-aiff'],
        '.amr': ['audio/amr'],
        '.opus': ['audio/opus'],
        '.m4a': ['audio/mp4', 'audio/x-m4a'],

        // Video formats
        '.wmv': ['video/x-ms-wmv'],
        '.avi': ['video/x-msvideo'],
        '.flv': ['video/x-flv'],
        '.mpg': ['video/mpeg'],
        '.mpeg': ['video/mpeg'],
        '.mp4': ['video/mp4'],
        '.m4v': ['video/x-m4v'],
        '.mov': ['video/quicktime'],
        '.webm': ['video/webm'],
        '.3gp': ['video/3gpp', 'audio/3gpp'],
        '.3ga': ['audio/3gpp'],
        '.mts': ['video/mp2t'],
        '.ogv': ['video/ogg'],
        '.mkv': ['video/x-matroska'],
        '.mxf': ['video/mxf']
    },
    ffprobe: {
        options: [
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_format',
            '-show_streams'
        ]
    },
    mediainfo: {
        options: ['--Output=JSON']
    },
    paths: {
        temp: '/tmp'
    },
    webhook: {
        maxRetries: 2,
        retryDelay: 1000,
        timeout: 5000,
        status: {
            SUCCESS: 'success',
            ERROR: 'error'
        }
    }
};

const s3Client = new S3Client();

async function validateFileType(bucket, key) {
    try {
        const { ContentType, ContentLength } = await s3Client.send(
            new HeadObjectCommand({ Bucket: bucket, Key: key })
        );

        const fileExtension = '.' + key.split('.').pop()?.toLowerCase();

        if (!config.allowedFileTypes[fileExtension]) {
            throw new Error(`Invalid file extension: ${fileExtension}`);
        }

        if (ContentType) {
            const isValidMimeType = config.allowedFileTypes[fileExtension].includes(ContentType.toLowerCase());

            if (!isValidMimeType) {
                throw new Error(`Invalid MIME type ${ContentType} for extension ${fileExtension}`);
            }
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

    let s3Metadata = {};
    let metadata = {};
    let contentInfo = {};

    try {
        const headCommand = new HeadObjectCommand({ Bucket: bucketName, Key: objectKey });
        const headResponse = await s3Client.send(headCommand);
        s3Metadata = headResponse.Metadata || {};

        if (s3Metadata.type === 'CONVERTED_FILE') {
            return {
                statusCode: 200,
                body: JSON.stringify({ message: `File ${objectKey} is a converted file.` }),
            };
        }

        const uploadEnvironment = s3Metadata.upload_environment;
        const userId = s3Metadata.user_id;
        const teamUserId = s3Metadata.team_user_id;
        const fileId = s3Metadata.file_id;
        const fileName = s3Metadata.file_name;

        const fileExtension = parse(objectKey).ext.slice(1);
        const fileNameWithExtension = `${fileName}.${fileExtension}`;

        console.log(`Processing file - ${bucketName}/${objectKey} of user - ${userId}`);

        contentInfo = await validateFileType(bucketName, objectKey);

        try {
            metadata = await getMetadata({ Bucket: bucketName, Key: objectKey });

            if (!metadata.duration) {
                throw new Error('Failed to extract duration from file');
            }

            const endTime = Date.now();
            const processingTimeInSeconds = (endTime - startTime) / 1000;
            console.log(`Total processing time: ${processingTimeInSeconds} seconds`);

            const webhookData = {
                status: config.webhook.status.SUCCESS,
                fileSize: contentInfo.ContentLength,
                duration: metadata.duration,
                codecName: metadata.codec_name,
                sampleRate: metadata.sample_rate,
                bitRate: metadata.bitrate,
                fileName,
                fileNameWithExtension,
                fileId,
                fileKey: objectKey,
                fileType: contentInfo.ContentType,
                timeTakenToExtractMetadata: processingTimeInSeconds,
                userId,
                teamUserId,
            };

            await sendWebhook(webhookData, uploadEnvironment);

            return {
                statusCode: 200,
                body: JSON.stringify({ metadata: webhookData }),
            };

        } catch (metadataError) {
            const endTime = Date.now();
            const processingTimeInSeconds = (endTime - startTime) / 1000;

            const errorWebhookData = {
                status: config.webhook.status.ERROR,
                error: metadataError.message,
                fileSize: contentInfo.ContentLength,
                fileName,
                fileNameWithExtension,
                fileId,
                fileKey: objectKey,
                fileType: contentInfo.ContentType,
                timeTakenToProcess: processingTimeInSeconds,
                userId,
                teamUserId
            };

            await sendWebhook(errorWebhookData, uploadEnvironment);

            throw metadataError;
        }

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

    const tempFilePath = join(config.paths.temp, `${randomUUID()}-full`);

    try {
        await streamToFile(Body, tempFilePath);
        try {
            const ffprobeMetadata = await runFFprobe(tempFilePath);
            if (ffprobeMetadata.duration > 0) {
                return ffprobeMetadata;
            }
            console.log('FFprobe returned zero duration, falling back to MediaInfo');
        } catch (error) {
            console.log('FFprobe failed, attempting with MediaInfo:', error.message);
        }
        return await runMediaInfo(tempFilePath);
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
    const ffprobe = spawn('ffprobe', [...config.ffprobe.options, filePath]);

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
                const videoStream = (parsedMetadata.streams || []).find(s => s.codec_type === 'video') || {};
                const audioStream = (parsedMetadata.streams || []).find(s => s.codec_type === 'audio') || {};

                const result = {
                    duration: parseFloat(format.duration),
                    bitrate: parseInt(format.bit_rate) || parseInt(videoStream.bit_rate) || parseInt(audioStream.bit_rate),
                    codec_name: videoStream.codec_name || audioStream.codec_name,
                    sample_rate: parseInt(videoStream.sample_rate) || parseInt(audioStream.sample_rate),
                };

                if(!result.duration || !result.bitrate || !result.codec_name || !result.sample_rate) {
                    reject(new Error('Failed to parse ffprobe output: Invalid file'));
                }

                console.log('Ffprobe parsed metadata:', JSON.stringify(result));
                resolve(result);
            } catch (err) {
                console.error('Error parsing ffprobe output:', err);
                reject(new Error(`Failed to parse ffprobe output: ${err.message}`));
            }
        }
    });
});

const runMediaInfo = (filePath) => new Promise((resolve, reject) => {
    const mediainfo = spawn('mediainfo', [...config.mediainfo.options, filePath]);

    let output = '';
    let errorOutput = '';

    mediainfo.stdout.on('data', (data) => {
        output += data.toString();
    });

    mediainfo.stderr.on('data', (data) => {
        errorOutput += data.toString();
    });

    mediainfo.on('error', (error) => {
        console.error('MediaInfo process error:', error);
        reject(new Error(`MediaInfo process error: ${error.message}`));
    });

    mediainfo.on('close', (code) => {
        if (code !== 0) {
            reject(new Error(`MediaInfo failed with code ${code}: ${errorOutput}`));
        } else {
            try {
                const parsedOutput = JSON.parse(output);
                const generalTrack = parsedOutput.media.track.find(t => t['@type'] === 'General') || {};
                const videoTrack = parsedOutput.media.track.find(t => t['@type'] === 'Video') || {};
                const audioTrack = parsedOutput.media.track.find(t => t['@type'] === 'Audio') || {};

                const result = {
                    duration: parseFloat(generalTrack.Duration),
                    bitrate: parseInt(generalTrack.OverallBitRate) || parseInt(videoTrack.BitRate) || parseInt(audioTrack.BitRate),
                    codec_name: videoTrack.Format || audioTrack.Format,
                    sample_rate: parseInt(videoTrack.SamplingRate) || parseInt(audioTrack.SamplingRate),
                };

                if(!result.duration || !result.bitrate || !result.codec_name || !result.sample_rate) {
                    reject(new Error('Failed to parse mediainfo output: Invalid file'));
                }

                console.log('MediaInfo parsed metadata:', JSON.stringify(result));
                resolve(result);
            } catch (err) {
                console.error('Error parsing mediainfo output:', err);
                reject(new Error(`Failed to parse mediainfo output: ${err.message}`));
            }
        }
    });
});

const sendWebhookRequest = (url, data, options) => new Promise((resolve) => {
    const req = https.request(options, (res) => {
        let responseBody = '';

        res.on('data', (chunk) => {
            responseBody += chunk;
        });

        res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                console.log('Webhook sent successfully. Response:', responseBody);
                resolve({ success: true, statusCode: res.statusCode, body: responseBody });
            } else {
                console.error(`HTTP error! status: ${res.statusCode}, body: ${responseBody}`);
                resolve({
                    success: false,
                    statusCode: res.statusCode,
                    error: `HTTP error! status: ${res.statusCode}`
                });
            }
        });
    });

    req.on('error', (error) => {
        console.error('Error sending webhook:', error);
        resolve({ success: false, error: error.message });
    });

    req.setTimeout(config.webhook.timeout, () => {
        req.destroy();
        resolve({ success: false, error: 'Request timeout' });
    });

    req.write(JSON.stringify(data));
    req.end();
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const sendWebhook = async (data, environment) => {
    const webhookUrl = config.webhookUrls[environment];

    if (!webhookUrl) {
        console.error('Webhook URL is not set in environment variables');
        return;
    }

    const url = new URL(webhookUrl);
    const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    };

    let lastError = null;
    let attempt = 0;
    const maxAttempts = config.webhook.maxRetries + 1;

    while (attempt < maxAttempts) {
        attempt++;
        console.log(`Webhook attempt ${attempt}/${maxAttempts}`);

        try {
            const result = await sendWebhookRequest(url, data, options);

            if (result.success) {
                return;
            }

            lastError = result.error;

            if (attempt < maxAttempts) {
                console.log(`Retrying webhook in ${config.webhook.retryDelay}ms...`);
                await sleep(config.webhook.retryDelay);
            }
        } catch (error) {
            lastError = error.message;

            if (attempt < maxAttempts) {
                console.log(`Retrying webhook in ${config.webhook.retryDelay}ms...`);
                await sleep(config.webhook.retryDelay);
            }
        }
    }

    throw new Error(`Failed to send webhook after ${maxAttempts} attempts. Last error: ${lastError}`);
};