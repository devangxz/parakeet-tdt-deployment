import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { FileTag, JobStatus, JobType } from "@prisma/client"

import { downloadFromS3, uploadToS3, s3Client, deleteFileFromS3 } from "./backend-helper"
import prisma from "@/lib/prisma"

// const userId = 2952506

async function moveFile(sourceBucket: string, destinationBucket: string, key: string) {
    try {
        // Get the object from source bucket
        const getObjectCommand = new GetObjectCommand({
            Bucket: sourceBucket,
            Key: key
        });

        const { Body, ContentType } = await s3Client.send(getObjectCommand);

        // Upload to destination bucket
        const putObjectCommand = new PutObjectCommand({
            Bucket: destinationBucket,
            Key: key,
            Body: Body,
            ContentType: ContentType
        });

        await s3Client.send(putObjectCommand);

        // Delete from source bucket
        const deleteObjectCommand = new DeleteObjectCommand({
            Bucket: sourceBucket,
            Key: key
        });

        await s3Client.send(deleteObjectCommand);

        console.log(`Successfully moved ${key} from ${sourceBucket} to ${destinationBucket}`);
    } catch (error) {
        console.error(`Error moving file ${key}:`, error);
        throw error;
    }
}

export const fileMigration = async (userId: number) => {
    try {

        const allRemoteLegalOrders = await prisma.order.findMany({
            where: {
                userId: userId
            },
            include: {
                File: true
            }
        })

        for (const order of allRemoteLegalOrders) {
            const fileId = order.File?.fileId

            if (!fileId) {
                console.log(`File ID not found for order ${order.id}`)
                continue
            }

            moveFile('cgws', 'cgws_ai_backup', `${fileId}.txt`)
            deleteFileFromS3(`${fileId}.txt`)

            moveFile('cgws', 'cgws_ai_backup', `${fileId}_asr.txt`)
            // 1. Download ASR file and upload with new name
            const asrText = (await (downloadFromS3(`${fileId}_asr.txt`))).toString()

            const { VersionId: ASRVersionId } = await uploadToS3(`${fileId}.txt`, Buffer.from(asrText))
            deleteFileFromS3(`${fileId}_asr.txt`)

            // 2. Save ASR file version
            await prisma.fileVersion.create({
                data: {
                    fileId,
                    s3VersionId: ASRVersionId,
                    tag: FileTag.AUTO
                }
            })

            // 3. Download QC file and upload with new name
            moveFile('cgws', 'cgws_ai_backup', `${fileId}_qc.txt`)
            const qcFile = (await (downloadFromS3(`${fileId}_qc.txt`))).toString()
            const { VersionId: QCVersionId } = await uploadToS3(`${fileId}.txt`, qcFile)
            deleteFileFromS3(`${fileId}_qc.txt`)

            // 4. Get QC assignment and save file version
            const qcAssignment = await prisma.jobAssignment.findFirst({
                where: {
                    orderId: order?.id,
                    type: JobType.QC,
                    status: JobStatus.COMPLETED,
                },
                select: {
                    transcriberId: true
                }
            })

            if (!qcAssignment) {
                console.log(`QC assignment not found for file ${fileId}`)
                throw new Error(`QC assignment not found for file ${fileId}`)
            }

            await prisma.fileVersion.create({
                data: {
                    fileId,
                    s3VersionId: QCVersionId,
                    userId: qcAssignment.transcriberId,
                    tag: FileTag.QC_DELIVERED
                }
            })

            moveFile('cgws', 'cgws_ai_backup', `${fileId}_cf.txt`)
            const cfDocxFile = await downloadFromS3(`${fileId}_cf.docx`)
            const { VersionId: CFDocxVersionId } = await uploadToS3(`${fileId}.docx`, cfDocxFile)
            deleteFileFromS3(`${fileId}_cf.docx`)

            await prisma.fileVersion.create({
                data: {
                    fileId,
                    s3VersionId: CFDocxVersionId,
                    tag: FileTag.CF_CUSTOMER_DELIVERED,
                    userId
                }
            })

        }

    } catch (error) {
        console.error('File migration failed:', error)
        throw error
    }
}
