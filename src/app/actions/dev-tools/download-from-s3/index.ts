'use server'
import { FileTag } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getFileVersionSignedURLFromS3 } from '@/utils/backend-helper'

export async function downloadFromS3(fileId: string, suffix: string) {
  try {
    if (!fileId || !suffix) {
      return {
        success: false,
        message: 'Missing fileId or suffix',
      }
    }

    const fileTagMap = {
      'asr': FileTag.AUTO,
      'qc': FileTag.QC_DELIVERED,
      'rev_docx': FileTag.CF_REV_SUBMITTED,
      'finalizer_docx': FileTag.CF_FINALIZER_SUBMITTED,
    }

    let key = ''
    let versionId = ''

    if (['asr', 'qc'].includes(suffix)) {
      key = `${fileId}.txt`
    } else if (['rev_docx', 'finalizer_docx'].includes(suffix)) {
      key = `${fileId}.docx`
    } else if (suffix === 'ris') {
      key = `${fileId}_ris.docx`
    } else if (suffix === 'ctms') {
      key = `${fileId}_ctms.json`
    } else if (suffix === 'mp3' || suffix === 'mp4') {
      key = `${fileId}.${suffix}`
    }

    if (['asr', 'qc', 'rev_docx', 'finalizer_docx'].includes(suffix)) {
      const fileVersion = await prisma.fileVersion.findFirst({
        where: {
          fileId,
          tag: fileTagMap[suffix as keyof typeof fileTagMap],
        },
        orderBy: {
          updatedAt: 'desc'
        }
      })

      if (fileVersion && fileVersion.s3VersionId) {
        versionId = fileVersion.s3VersionId
      }
    }

    const signedUrl = await getFileVersionSignedURLFromS3(key, versionId)
    logger.info(`Signed URL generated for file ${fileId} with suffix ${suffix}`)
    return { success: true, signedUrl }
  } catch (error) {
    logger.error('Error generating signed URL:', error)
    return {
      success: false,
      message: 'Failed to generate signed URL',
    }
  }
}
