'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import extractDataFromRISFile from '@/services/file-service/get-ris'

export async function getRISDataAction(fileId: string, templateType: string) {
  logger.info(`--> getRISData ${fileId}`)

  try {
    if (!fileId) {
      return {
        success: false,
        error: 'fileId is required',
      }
    }

    if (!templateType) {
      return {
        success: false,
        error: 'template is required',
      }
    }

    const session = await getServerSession(authOptions)
    const user = session?.user
    const organizationName = user?.organizationName?.toLowerCase() as string
    logger.info(`organizationName: ${organizationName}`)

    const risData = await extractDataFromRISFile(
      fileId,
      templateType,
      organizationName
    )

    await prisma.file.update({
      where: { fileId: fileId },
      data: { customFormattingDetails: risData },
    })

    logger.info(`<-- getRISData ${fileId}`)
    return {
      success: true,
      data: risData,
    }
  } catch (err) {
    logger.error(`get RIS data failed ${(err as Error).toString()}`)
    return {
      success: false,
      error: 'get RIS data failed',
    }
  }
}
