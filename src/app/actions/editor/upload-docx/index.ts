'use server'

import { FileTag, OrderStatus } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { deleteFileVersionFromS3, uploadToS3 } from '@/utils/backend-helper'

export async function uploadDocxAction(formData: FormData, fileId: string) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user
        const transcriberId = user?.userId as number

        if (!fileId) {
            return {
                success: false,
                message: 'File ID is required'
            }
        }

        const file = formData.get('file') as File | null

        if (!file) {
            return {
                success: false,
                message: 'No file uploaded'
            }
        }

        const order = await prisma.order.findUnique({
            where: {
                fileId: fileId,
            },
        })

        if (!order) {
            return {
                success: false,
                message: 'Order not found'
            }
        }

        // Extract file extension from the original file
        const fileParts = file.name.split('.')
        const fileExtension = fileParts.length > 1 
            ? fileParts[fileParts.length - 1].toLowerCase() 
            : 'docx'
        
        // Create filename with proper extension
        const filename = `${fileId}.${fileExtension}`
        const buffer = await file.arrayBuffer()

        // Determine the proper content type based on file extension
        let contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        const mimeTypes: Record<string, string> = {
            docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            pdf: 'application/pdf',
            txt: 'text/plain',
            rtf: 'application/rtf',
            doc: 'application/msword',
            odt: 'application/vnd.oasis.opendocument.text',
            ass: 'text/x-ass',
            zip: 'application/zip'
        }
        
        if (fileExtension in mimeTypes) {
            contentType = mimeTypes[fileExtension]
        }

        const { VersionId } = await uploadToS3(
            filename,
            Buffer.from(buffer),
            contentType
        )

        let tag: FileTag = FileTag.CF_REV_SUBMITTED

        if (order?.status === OrderStatus.FINALIZER_ASSIGNED) {
            tag = FileTag.CF_FINALIZER_SUBMITTED
        }

        if (order?.status === OrderStatus.PRE_DELIVERED) {
            tag = FileTag.CF_OM_DELIVERED
        }

        const fileVersion = await prisma.fileVersion.findFirst({
            where: {
                userId: transcriberId,
                fileId,
                tag
            },
            orderBy: {
                updatedAt: 'desc'
            }
        })

        if (!fileVersion || !fileVersion.s3VersionId) {
            await prisma.fileVersion.create({
                data: {
                    userId: transcriberId,
                    fileId,
                    tag,
                    s3VersionId: VersionId,
                    s3Key: filename,
                    extension: fileExtension
                }
            })
        } else {
            await deleteFileVersionFromS3(fileVersion.s3Key || filename, fileVersion.s3VersionId)

            await prisma.fileVersion.update({
                where: { id: fileVersion.id },
                data: {
                    s3VersionId: VersionId,
                    s3Key: filename,
                    extension: fileExtension
                }
            })
        }

        if (tag === FileTag.CF_OM_DELIVERED) {
            await prisma.fileVersion.updateMany({
                where: {
                    fileId,
                    tag: FileTag.CF_CUSTOMER_DELIVERED,
                    userId: order.userId
                },
                data: {
                    s3VersionId: VersionId
                }
            })
        }

        logger.info(`File uploaded successfully for ${fileId} with extension ${fileExtension}`)
        return {
            success: true,
            message: 'File uploaded successfully'
        }

    } catch (error) {
        logger.error(`Error uploading file: ${error}`)
        return {
            success: false,
            message: 'Error uploading file'
        }
    }
}