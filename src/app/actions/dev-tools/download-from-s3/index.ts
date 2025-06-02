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
      asr: FileTag.AUTO,
      qc: FileTag.QC_DELIVERED,
      rev_docx: FileTag.CF_REV_SUBMITTED,
      finalizer_docx: FileTag.CF_FINALIZER_SUBMITTED,
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
      const versionRecs = await prisma.fileVersion.findMany({
        where: {
          fileId,
          tag: {
            in: [FileTag.AUTO, FileTag.ASSEMBLY_AI, FileTag.ASSEMBLY_AI_GPT_4O],
          },
          s3VersionId: { not: null },
        },
        select: { tag: true, s3VersionId: true },
        orderBy: { createdAt: 'asc' },
      })
      const autoRec = versionRecs.find((v) => v.tag === FileTag.AUTO)
      if (autoRec?.s3VersionId) {
        const autoS3VersionId = autoRec.s3VersionId
        const assemblyMatch = versionRecs.find(
          (v) =>
            v.tag === FileTag.ASSEMBLY_AI && v.s3VersionId === autoS3VersionId
        )
        const combinedMatch = versionRecs.find(
          (v) =>
            v.tag === FileTag.ASSEMBLY_AI_GPT_4O &&
            v.s3VersionId === autoS3VersionId
        )
        if (assemblyMatch) {
          key = `${fileId}_assembly_ai_ctms.json`
        } else if (combinedMatch) {
          key = `${fileId}_assembly_ai_gpt_4o_ctms.json`
        } else {
          key = `${fileId}_ctms.json`
        }
      }
    } else if (suffix === 'mp3' || suffix === 'mp4') {
      key = `${fileId}.${suffix}`
    } else if (suffix === 'original') {
      const file = await prisma.file.findUnique({
        where: {
          fileId: fileId,
        },
      })
      if (file) {
        key = file.fileKey ?? ''
      } else {
        return {
          success: false,
          message: 'File not found',
        }
      }
    }

    if (['asr', 'qc', 'rev_docx', 'finalizer_docx'].includes(suffix)) {
      const fileVersion = await prisma.fileVersion.findFirst({
        where: {
          fileId,
          tag: fileTagMap[suffix as keyof typeof fileTagMap],
        },
        orderBy: {
          updatedAt: 'desc',
        },
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
