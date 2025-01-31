/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'
import { FileTag, OrderStatus } from '@prisma/client'
import mammoth from 'mammoth'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getFileVersionFromS3 } from '@/utils/backend-helper'
import { diff_match_patch } from '@/utils/transcript/diff_match_patch'

export async function getFinalizerComments(fileId: string) {
    try {

        const order = await prisma.order.findUnique({
            where: {
                fileId: fileId,
                status: {
                    in: [OrderStatus.FINALIZING_COMPLETED, OrderStatus.PRE_DELIVERED, OrderStatus.DELIVERED]
                }
            },
            select: {
                finalizerComment: true
            }
        })

        if (!order) return { success: false, message: 'Order not found' }

        const revFileVersion = await prisma.fileVersion.findFirst({
            where: {
                fileId: fileId,
                tag: FileTag.CF_REV_SUBMITTED,
            },
        })

        if (!revFileVersion || !revFileVersion.s3VersionId) return { success: false, message: 'File version not found' }

        const finalizerFileVersion = await prisma.fileVersion.findFirst({
            where: {
                fileId: fileId,
                tag: FileTag.CF_FINALIZER_SUBMITTED,
            },
        })

        if (!finalizerFileVersion || !finalizerFileVersion.s3VersionId) return { success: false, message: 'File version not found' }

        const revDocx = await getFileVersionFromS3(`${fileId}.docx`, revFileVersion.s3VersionId)
        const finalizerDocx = await getFileVersionFromS3(`${fileId}.docx`, finalizerFileVersion.s3VersionId)

        const { value: revDocxText } = await mammoth.extractRawText({
            buffer: Buffer.from(revDocx),
        });

        const { value: finalizerDocxText } = await mammoth.extractRawText({
            buffer: Buffer.from(finalizerDocx),
        });

        const dmp = new diff_match_patch();
        const diffs = dmp.diff_main(revDocxText, finalizerDocxText);
        dmp.diff_cleanupSemantic(diffs);

        const diffData = diffs.map(([operation, text]) => ({
            operation: operation === -1 ? 'removed' : operation === 1 ? 'added' : 'unchanged',
            text
        }));

        if (order.finalizerComment) {
            logger.info(`Finalizer comment fetched successfully for file ${fileId}`)
            return { success: true, finalizerComment: order.finalizerComment, diffData }
        } else {
            return { success: true, finalizerComment: '' }
        }

    } catch (error) {
        logger.error(error)
        return { success: false, message: 'Failed to fetch finalizer comment' }
    }
}
