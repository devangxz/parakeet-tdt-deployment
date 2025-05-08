import { FileTag } from '@prisma/client'
import axios from 'axios'

import { FILE_CACHE_URL } from '@/constants'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getFileVersionFromS3 } from '@/utils/backend-helper'
import getCustomerTranscript from '@/utils/getCustomerTranscript'

export async function createCustomerTranscript(fileId: string, userId: number) {
  try {
    logger.info(`--> createCustomerTranscript: ${fileId} ${userId}`)
    let latestCustomerTranscript = await prisma.fileVersion.findFirst({
      where: {
        fileId: fileId,
        tag: FileTag.OM_EDIT,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  
    if (!latestCustomerTranscript) {
      latestCustomerTranscript = await prisma.fileVersion.findFirst({
        where: {
          fileId: fileId,
          tag: FileTag.QC_DELIVERED,
        },
        orderBy: {
          createdAt: 'desc',
        }
      })
    }

    if (!latestCustomerTranscript?.s3VersionId) {
      throw new Error("Could not create customer delivered version!")
    }
    logger.info(`--> createCustomerTranscript: ${fileId} ${latestCustomerTranscript?.s3VersionId} ${latestCustomerTranscript?.tag}`)
    const transcript = (await getFileVersionFromS3(`${fileId}.txt`, latestCustomerTranscript?.s3VersionId ?? '')).toString()

    const customerTranscript = await getCustomerTranscript(fileId, transcript)
    
    await axios.post(
      `${FILE_CACHE_URL}/save-transcript`,
      {
        fileId: fileId,
        transcript: customerTranscript,
        userId: userId,
      },
      {
        headers: {
          'x-api-key': process.env.SCRIBIE_API_KEY,
        },
      }
    )
    logger.info(`<-- createCustomerTranscript generated successfully for file: ${fileId} ${userId} `)
  }
  catch (error) {
    logger.error(`[createCustomerTranscript] error: ${error}`)
    throw new Error(`Error while creating customer delivered version!: ${error}`)
  }
} 