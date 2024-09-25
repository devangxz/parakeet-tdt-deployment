// TODO: Move this file to app/api/s3
import { S3Client, CreateMultipartUploadCommand } from "@aws-sdk/client-s3";

import type { NextApiRequest, NextApiResponse } from 'next';

const s3Client = new S3Client({
    region: process.env.AWS_S3_REGION ?? '',
    credentials: {
        accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY ?? '',
    },
});

const createMultipartUpload = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === 'POST') {
        try {
            const { fileInfo } = req.body;
            const command = new CreateMultipartUploadCommand({
                Bucket: process.env.AWS_S3_BUCKET_NAME,
                Key: `upload/${fileInfo.name}`,
                ContentType: fileInfo.type,
            });
            const data = await s3Client.send(command);
            res.status(200).json({
                uploadId: data.UploadId,
                key: data.Key,
            });
        } catch (error) {
            res.status(500).json({ error: (error as Error).message });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
};

export default createMultipartUpload;