import { PutObjectCommand } from "@aws-sdk/client-s3";

import { s3Client } from '../lib/s3Client';

export async function performASR(fileKey: string): Promise<string> {
    // Simulate transcription process
    await new Promise(resolve => setTimeout(resolve, 260000));

    const transcribedText = `Transcription for file: ${fileKey}`;

    // Upload transcribed text to S3
    const uploadParams = {
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: `transcriptions/${fileKey.split('/').pop()}.txt`,
        Body: transcribedText,
    };

    try {
        const command = new PutObjectCommand(uploadParams);
        const uploadResult = await s3Client.send(command);
        console.log('Transcription uploaded successfully:', uploadResult);

        // Construct the S3 URL manually since the new SDK doesn't return the Location
        const s3Url = `https://${uploadParams.Bucket}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${uploadParams.Key}`;
        return s3Url;
    } catch (error) {
        console.error('Error uploading transcription:', error);
        throw error;
    }
};