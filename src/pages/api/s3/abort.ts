// TODO: Move this file to app/api/s3
import { S3Client, AbortMultipartUploadCommand } from "@aws-sdk/client-s3";

import type { NextApiRequest, NextApiResponse } from 'next';

const s3Client = new S3Client({
    region: process.env.AWS_S3_REGION ?? '',
    credentials: {
        accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY ?? '',
    },
});

const abortHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === 'POST') {
        try {
            const { sendBackData } = req.body;
            const command = new AbortMultipartUploadCommand({
                Bucket: process.env.AWS_S3_BUCKET_NAME,
                Key: sendBackData.key,
                UploadId: sendBackData.uploadId,
            });
            await s3Client.send(command);
            res.status(200).json({ success: true });
        } catch (error) {
            res.status(500).json({ error: (error as Error).message });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
};

export default abortHandler;