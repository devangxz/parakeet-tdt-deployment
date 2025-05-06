'use server'

import { FileTag } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { fileCacheTokenAction } from '../../auth/file-cache-token'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import { FILE_CACHE_URL } from '@/constants'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { CTMType } from '@/utils/editorUtils'

interface RevertResult {
  success: boolean
  message: string
  transcript?: string
  ctms?: CTMType[]
}

export async function revertToDefaultVersionAction(
  fileId: string,
  sourceTag: FileTag = FileTag.ASSEMBLY_AI
): Promise<RevertResult> {
  try {
    logger.info(
      `--> revertToDefaultVersionAction for fileId: ${fileId}, tag: ${sourceTag}`
    )

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }
    if (!fileId) {
      throw new Error('File ID is required')
    }

    const allowedTags: FileTag[] = [
      FileTag.ASSEMBLY_AI,
      FileTag.ASSEMBLY_AI_GPT_4O,
    ]
    if (!allowedTags.includes(sourceTag)) {
      return {
        success: false,
        message: 'Invalid version',
      }
    }

    const sourceTagName =
      sourceTag === FileTag.ASSEMBLY_AI_GPT_4O
        ? 'AssemblyAI + GPT-4o Transcribe'
        : 'AssemblyAI'

    const sourceVersion = await prisma.fileVersion.findFirst({
      where: {
        fileId,
        tag: sourceTag,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })
    if (!sourceVersion || !sourceVersion.s3VersionId) {
      return {
        success: false,
        message: `${sourceTagName} transcript version not found for this file`,
      }
    }

    const autoVersion = await prisma.fileVersion.findFirst({
      where: {
        fileId,
        tag: FileTag.AUTO,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })
    if (!autoVersion) {
      throw new Error('AUTO version not found for this file')
    }

    await prisma.fileVersion.update({
      where: { id: autoVersion.id },
      data: {
        s3VersionId: sourceVersion.s3VersionId,
        updatedAt: new Date(),
      },
    })

    let transcript
    let ctms
    try {
      const tokenRes = await fileCacheTokenAction()
      const res = await fetch(
        `${FILE_CACHE_URL}/rollback/${fileId}/${sourceVersion.commitHash}/${sourceTag}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${tokenRes.token}` },
        }
      )
      if (!res.ok) {
        throw new Error('Failed to rollback')
      }

      const data = await res.json()
      if (data.success && data.transcript && data.ctms) {
        transcript = data.transcript
        ctms = data.ctms
      } else {
        logger.error(
          `Error rolling back git commit for file ${fileId} to tag ${sourceTag}`
        )
        throw new Error('Failed to rollback')
      }
    } catch (rollbackError) {
      logger.error(
        `Error rolling back git commit for file ${fileId} to tag ${sourceTag}: ${rollbackError}`
      )
      throw new Error('Failed to rollback')
    }

    logger.info(`File ${fileId} reverted to ${sourceTag} transcript`)

    return {
      success: true,
      message: `Successfully reverted to ${sourceTagName} transcript`,
      transcript,
      ctms,
    }
  } catch (error) {
    logger.error(
      `Error reverting file ${fileId} to ${sourceTag} transcript: ${error}`
    )

    return {
      success: false,
      message: 'Failed to revert the transcript',
    }
  }
}
