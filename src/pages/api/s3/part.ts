// TODO: Move this file to app/api/s3
import { S3Client, UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type { NextApiRequest, NextApiResponse } from 'next';

const s3Client = new S3Client({
    region: process.env.AWS_S3_REGION ?? '',
    credentials: {
        accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY ?? '',
    },
});

const partHandler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === 'POST') {
        try {
            const { sendBackData, partNumber, contentLength } = req.body;
            const command = new UploadPartCommand({
                Bucket: process.env.AWS_S3_BUCKET_NAME,
                Key: sendBackData.key,
                UploadId: sendBackData.uploadId,
                PartNumber: partNumber,
                ContentLength: contentLength,
            });
            const url = await getSignedUrl(s3Client, command, { expiresIn: 48 * 3600 });
            res.status(200).json({ url });
        } catch (error) {
            res.status(500).json({ error: (error as Error).message });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
};

export default partHandler;