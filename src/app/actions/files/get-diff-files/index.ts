'use server'

import { FileTag } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getFileVersionFromS3 } from '@/utils/backend-helper'

export async function getDiffFilesAction(fileId: string) {
    try {
        const asrFileVersion = await prisma.fileVersion.findFirst({
            where: {
                fileId,
                tag: FileTag.AUTO,
            },
            orderBy: {
                updatedAt: 'asc',
            },
        })

        if (!asrFileVersion || !asrFileVersion.s3VersionId) {
            throw new Error('ASR file not found')
        }

        const latestFileVersion = await prisma.fileVersion.findFirst({
          where: {
              fileId,
              tag: {
                in: [FileTag.OM_EDIT, FileTag.QC_DELIVERED]
              }
          },
          orderBy: {
              updatedAt: 'desc',
          },
        })

        if (!latestFileVersion || !latestFileVersion.s3VersionId) {
            throw new Error('No edited version found (OM_EDIT or QC_DELIVERED)')
        }
        
        const asrFile = (await getFileVersionFromS3(`${fileId}.txt`, asrFileVersion.s3VersionId)).toString()
        const qcFile = (await getFileVersionFromS3(`${fileId}.txt`, latestFileVersion.s3VersionId)).toString()

        return {
            success: true,
            asrFile,
            qcFile,
        }
    } catch (error) {
        logger.error(`Failed to get diff files for ${fileId}: ${error}`)
        return {
            success: false,
            message: 'An error occurred while getting diff files',
        }
    }
}

export async function getScreeningDiffFilesAction(fileId: string) {
    try {
        const assemblyAiVersion = await prisma.fileVersion.findFirst({
            where: {
                fileId,
                tag: FileTag.ASSEMBLY_AI,
            },
            orderBy: {
                updatedAt: 'desc',
            },
        })

        if (!assemblyAiVersion?.s3VersionId) {
            return {
                success: false,
                message: 'No AssemblyAI version available',
            }
        }

        const assemblyAiFile = (await getFileVersionFromS3(`${fileId}.txt`, assemblyAiVersion.s3VersionId)).toString()

        const combinedVersion = await prisma.fileVersion.findFirst({
            where: {
                fileId,
                tag: FileTag.ASSEMBLY_AI_GPT_4O,
            },
            orderBy: {
                updatedAt: 'desc',
            },
        })
        
        if (combinedVersion?.s3VersionId) {
            const combinedFile = (await getFileVersionFromS3(`${fileId}.txt`, combinedVersion.s3VersionId)).toString()
            
            return {
                success: true,
                assemblyAiFile,
                combinedFile,
                hasCombinedVersion: true,
            }
        }
        
        return {
            success: true,
            assemblyAiFile,
            hasCombinedVersion: false,
        }

    } catch (error) {
        logger.error(`Failed to get screening diff files for ${fileId}: ${error}`)
        return {
            success: false,
            message: 'An error occurred while getting screening diff files',
        }
    }
}
