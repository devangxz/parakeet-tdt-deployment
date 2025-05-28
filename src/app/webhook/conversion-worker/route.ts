import { ReportOption } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

import { DURATION_DIFF } from '@/constants'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAWSSesInstance } from '@/lib/ses'
import authenticateWebhook from '@/utils/authenticateWebhook'

interface ConversionResult {
  status: 'SUCCESS' | 'ERROR'
  userId: string
  fileId: string
  duration?: number
  error?: string
}

async function reportFile(
  fileId: string,
  reportOption: ReportOption,
  reportComment: string
) {
  logger.info(
    `[${fileId}] Reporting file with reason: ${reportOption} - ${reportComment}`
  )

  await prisma.file.update({
    where: { fileId },
    data: {
      reportOption,
      reportComment,
    },
  })
}

async function processConversionResult(result: ConversionResult) {
  const { status, userId, fileId, duration } = result

  try {
    if (status === 'SUCCESS') {
      await prisma.file
        .update({
          where: { fileId },
          data: { converted: true },
        })
        .catch((error) => {
          logger.error(
            `Failed to update conversion status in database: ${fileId} - ${error}`
          )
        })

      if (duration) {
        const file = await prisma.file.findUnique({
          where: { fileId },
          select: { duration: true },
        })

        if (file) {
          const durationDiff = Math.abs(file.duration - duration)
          if (durationDiff > DURATION_DIFF) {
            const user = await prisma.user.findUnique({
              where: { id: Number(userId) },
              select: { email: true },
            })

            const reportComment = `The duration difference of ${durationDiff}s is above the acceptable threshold of ${DURATION_DIFF}s`
            await reportFile(
              fileId,
              ReportOption.DURATION_DIFFERENCE,
              reportComment
            )

            const ses = getAWSSesInstance()
            await ses.sendAlert(
              `File Duration Difference`,
              `Duration difference detected for file ${fileId} uploaded by ${user?.email}. Original duration: ${file.duration}s, Converted duration: ${duration}s, Difference: ${durationDiff}s`,
              'software'
            )

            logger.info(`[${fileId}] File reported with duration difference`)
          }
        }
      }
    } else {
      await prisma.file
        .update({
          where: { fileId },
          data: { converted: false },
        })
        .catch((updateError) => {
          logger.error(
            `Error updating file conversion failure status: ${updateError}`
          )
        })

      const reportComment = 'The file conversion process failed'
      await reportFile(fileId, ReportOption.CONVERSION_ERROR, reportComment)

      logger.info(`[${fileId}] File reported with conversion error`)
    }
  } catch (error) {
    logger.error(
      `Error processing conversion-worker result for fileId ${fileId}: ${error}`
    )
    throw error
  }
}

export async function POST(req: NextRequest) {
  // Authenticate webhook and check rate limit
  const authResult = await authenticateWebhook(req, 'CONVERSION-WORKER')
  if (authResult.error) return authResult.error

  const conversionResult = await req.json()

  try {
    if (!conversionResult || !conversionResult.status) {
      return NextResponse.json(
        { error: 'Invalid conversion result' },
        { status: 400 }
      )
    }

    await processConversionResult(conversionResult)

    logger.info(
      `Conversion-worker webhook processed successfully for file ID ${conversionResult.fileId}`
    )
    return NextResponse.json(null, { status: 200 })
  } catch (error) {
    logger.error(
      `Error processing conversion-worker webhook for file ID ${conversionResult?.fileId} and user ID ${conversionResult?.userId}: ${error}`
    )
    return NextResponse.json(
      {
        error: `Error processing conversion-worker webhook for file ID ${conversionResult?.fileId} and user ID ${conversionResult?.userId}`,
      },
      { status: 500 }
    )
  }
}
