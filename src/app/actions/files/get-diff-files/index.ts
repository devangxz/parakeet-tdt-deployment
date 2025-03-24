'use server'

import { FileTag, FileVersion } from '@prisma/client'

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
                updatedAt: 'desc',
            },
        })

        if (!asrFileVersion || !asrFileVersion.s3VersionId) {
            throw new Error('ASR file not found')
        }

        const omFileVersion = await prisma.fileVersion.findFirst({
          where: {
              fileId,
              tag: FileTag.OM_EDIT,
          },
          orderBy: {
              updatedAt: 'desc',
          },
        })
        let qcFileVersion: FileVersion | null = null;
        if(!omFileVersion || !omFileVersion.s3VersionId) {
          qcFileVersion = await prisma.fileVersion.findFirst({
              where: {
                  fileId,
                  tag: FileTag.QC_DELIVERED,
              },
              orderBy: {
                  updatedAt: 'desc',
              },
          })
          if (!qcFileVersion || !qcFileVersion.s3VersionId) {
              throw new Error('QC file not found')
          }
        }
        const latestFileVersion = omFileVersion || qcFileVersion
        if(!latestFileVersion || !latestFileVersion.s3VersionId) {
          throw new Error('No transcriber edited file version not found')
        }
        
        const asrFile = (await getFileVersionFromS3(`${fileId}.txt`, asrFileVersion.s3VersionId)).toString()
        const qcFile = (await getFileVersionFromS3(`${fileId}.txt`, latestFileVersion.s3VersionId)).toString()

        return {
            success: true,
            asrFile,
            qcFile,
        }
    } catch (error) {
        logger.error(`Failed to move file ${fileId}`, error)
        return {
            success: false,
            message: 'An error occurred while moving file',
        }
    }
}
