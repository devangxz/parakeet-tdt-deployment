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

        const filename = `${fileId}.docx`
        const buffer = await file.arrayBuffer()

        const { VersionId } = await uploadToS3(
            filename,
            Buffer.from(buffer),
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
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
                }
            })
        } else {
            await deleteFileVersionFromS3(filename, fileVersion.s3VersionId)

            await prisma.fileVersion.update({
                where: { id: fileVersion.id },
                data: {
                    s3VersionId: VersionId
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

        logger.info(`File uploaded successfully for ${fileId}`)
        return {
            success: true,
            message: 'File uploaded successfully'
        }

    } catch (error) {
        logger.error(`Error uploading docx file: ${error}`)
        return {
            success: false,
            message: 'Error uploading file'
        }
    }
}