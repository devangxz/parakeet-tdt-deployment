// TODO: Move this file to app/api/s3
import { S3Client, CompleteMultipartUploadCommand, ListPartsCommand } from "@aws-sdk/client-s3";

import { transcriptionService } from '@/services/transcription.service';

import type { NextApiRequest, NextApiResponse } from 'next';

const s3Client = new S3Client({
    region: process.env.AWS_S3_REGION ?? '',
    credentials: {
        accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY ?? '',
    },
});

const completeUploadHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === 'POST') {
        try {
            const { sendBackData } = req.body;
            // List all parts
            const listPartsCommand = new ListPartsCommand({
                Bucket: process.env.AWS_S3_BUCKET_NAME,
                Key: sendBackData.key,
                UploadId: sendBackData.uploadId,
            });
            const partsModel = await s3Client.send(listPartsCommand);
            // Complete multipart upload
            const command = new CompleteMultipartUploadCommand({
                Bucket: process.env.AWS_S3_BUCKET_NAME,
                Key: sendBackData.key,
                UploadId: sendBackData.uploadId,
                MultipartUpload: {
                    Parts: partsModel.Parts,
                },
            });
            await s3Client.send(command);

            // Create transcription job
            const jobId = await transcriptionService.createJob(sendBackData.key);

            res.status(200).json({ success: true, jobId });
        } catch (error) {
            res.status(500).json({ error: (error as Error).message });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
};

export default completeUploadHandler;