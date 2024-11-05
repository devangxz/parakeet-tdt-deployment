import { FileTag, JobStatus, JobType } from "@prisma/client"

import { downloadFromS3, uploadToS3, deleteFileFromS3 } from "./backend-helper"
import prisma from "@/lib/prisma"

async function moveFile(sourceBucket: string, destinationBucket: string, key: string) {
    try {
        // Get the object from source bucket
        let contentType = 'text/plain'
        if (key.endsWith('.docx')) {
            contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        }
        const buffer = await downloadFromS3(key)
        await uploadToS3(key, buffer, contentType, destinationBucket)

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

            await moveFile('cgws3', 'cgws3-backup', `${fileId}.txt`)
            await deleteFileFromS3(`${fileId}.txt`)

            await moveFile('cgws3', 'cgws3-backup', `${fileId}_asr.txt`)
            // 1. Download ASR file and upload with new name
            const asrText = (await (downloadFromS3(`${fileId}_asr.txt`))).toString()

            const { VersionId: ASRVersionId } = await uploadToS3(`${fileId}.txt`, Buffer.from(asrText))
            await deleteFileFromS3(`${fileId}_asr.txt`)

            // 2. Save ASR file version
            await prisma.fileVersion.create({
                data: {
                    fileId,
                    s3VersionId: ASRVersionId,
                    tag: FileTag.AUTO
                }
            })

            // 3. Download QC file and upload with new name
            await moveFile('cgws3', 'cgws3-backup', `${fileId}_qc.txt`)
            const qcFile = (await (downloadFromS3(`${fileId}_qc.txt`))).toString()
            const { VersionId: QCVersionId } = await uploadToS3(`${fileId}.txt`, qcFile)
            await deleteFileFromS3(`${fileId}_qc.txt`)

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

            await moveFile('cgws3', 'cgws3-backup', `${fileId}_cf.docx`)
            const cfDocxFile = await downloadFromS3(`${fileId}_cf.docx`)
            const { VersionId: CFDocxVersionId } = await uploadToS3(`${fileId}.docx`, cfDocxFile)
            await deleteFileFromS3(`${fileId}_cf.docx`)

            await prisma.fileVersion.create({
                data: {
                    fileId,
                    s3VersionId: CFDocxVersionId,
                    tag: FileTag.CF_CUSTOMER_DELIVERED,
                    userId
                }
            })

            //deleting the unused files
            await moveFile('cgws3', 'cgws3-backup', `${fileId}_cf.txt`)
            await moveFile('cgws3', 'cgws3-backup', `${fileId}_cf_rev.txt`)
            await deleteFileFromS3(`${fileId}_cf.txt`)
            await deleteFileFromS3(`${fileId}_cf_rev.txt`)

        }

    } catch (error) {
        console.error('File migration failed:', error)
        throw error
    }
}