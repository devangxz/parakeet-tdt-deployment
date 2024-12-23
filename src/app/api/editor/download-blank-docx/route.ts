export const dynamic = 'force-dynamic'
import { FileTag, OrderStatus, OrderType } from '@prisma/client'
import axios from 'axios'
import { NextRequest, NextResponse } from 'next/server'

import { FILE_CACHE_URL } from '@/constants'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getFileVersionFromS3 } from '@/utils/backend-helper'
import { getTranscriptWithSpeakers, removeTimestamps } from '@/utils/getCustomerTranscript'

export async function GET(req: NextRequest) {
  let fileId = ''
  try {
    const { searchParams } = new URL(req.url)
    fileId = searchParams.get('fileId') as string
    const type = searchParams.get('type')
    const orgName = searchParams.get('orgName')
    const templateName = searchParams.get('templateName')
    const userToken = req.headers.get('x-user-token')
    const user = JSON.parse(userToken ?? '{}')
    const userId = user.userId

    if (!fileId || !type || !orgName || !templateName) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    logger.info(
      `--> downloadBlankDocx ${fileId} ${type} ${orgName} ${templateName}`
    )

    const order = await prisma.order.findUnique({
      where: {
        fileId,
      },
    })

    if (!order) {
      logger.error(`Order not found for ${fileId}`)
      throw new Error(`Order not found for ${fileId}`)
    }

    if (order.status === OrderStatus.FINALIZER_ASSIGNED) {
      const fileVersion = await prisma.fileVersion.findFirst({
        where: {
          fileId,
          tag: FileTag.CF_REV_SUBMITTED,
        },
        select: {
          s3VersionId: true,
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      if (!fileVersion || !fileVersion.s3VersionId) {
        logger.error(`File version not found for ${fileId}`)
        return NextResponse.json(
          { error: 'File version not found' },
          { status: 404 }
        )
      }

      const fileBuffer = await getFileVersionFromS3(
        `${fileId}.docx`,
        fileVersion?.s3VersionId
      )
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Disposition': `attachment; filename="${fileId}.docx"`,
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
      })
    } else if (order.status === OrderStatus.REVIEWER_ASSIGNED) {
      if (type === 'marking') {
        const response = await axios.get(
          `${FILE_CACHE_URL}/get-cf-docx/${fileId}?type=${type}&orgName=${orgName.toLowerCase()}&templateName=${templateName}&userId=${userId}`,
          {
            responseType: 'arraybuffer',
            headers: {
              'x-api-key': process.env.SCRIBIE_API_KEY,
            },
          }
        )
        const fileBuffer = Buffer.from(response.data)
        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            'Content-Disposition': `attachment; filename="${fileId}.docx"`,
            'Content-Type':
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          },
        })
      } else {
        const fileVersion = await prisma.fileVersion.findFirst({
          where: {
            fileId,
            tag: FileTag.QC_DELIVERED
          },
          orderBy: {
            updatedAt: 'desc'
          }
        })

        if (!fileVersion || !fileVersion.s3VersionId) {
          logger.error(`File version not found for ${fileId}`)
          return NextResponse.json({ message: 'File version not found' }, { status: 404 })
        }

        let transcript = (await getFileVersionFromS3(`${fileId}.txt`, fileVersion?.s3VersionId)).toString();

        const invoiceFile = await prisma.invoiceFile.findFirst({
          where: {
            fileId,
          },
        })

        const invoice = await prisma.invoice.findUnique({
          where: {
            invoiceId: invoiceFile?.invoiceId,
          },
        })

        const options = JSON.parse(invoice?.options ?? '{}')

        const speakers: { fn: string, ln: string }[] = options.sn ? options.sn[fileId] : [];

        transcript = removeTimestamps(getTranscriptWithSpeakers(transcript, speakers))

        if (orgName.toLowerCase() === 'acr'){
          // Add double space after periods and question marks
          transcript = transcript.replace(/\.(\s)?/g, '.  ')
          transcript = transcript.replace(/\?(\s)?/g, '?  ')

          // Remove extra blank lines between paragraphs
          transcript = transcript.replace(/\n\n/g, '\n')
        }

        return new NextResponse(transcript, {
          status: 200,
          headers: {
            'Content-Disposition': `attachment; filename="${fileId}.txt"`,
            'Content-Type': 'text/plain',
          },
        })
      }

    } else if (
      order.status === OrderStatus.PRE_DELIVERED &&
      order.orderType === OrderType.TRANSCRIPTION_FORMATTING
    ) {
      const fileVersion = await prisma.fileVersion.findFirst({
        where: {
          fileId,
          tag: FileTag.CF_FINALIZER_SUBMITTED,
        },
        select: {
          s3VersionId: true,
        },
      })

      if (!fileVersion || !fileVersion.s3VersionId) {
        logger.error(`File version not found for ${fileId}`)
        return NextResponse.json(
          { error: 'File version not found' },
          { status: 404 }
        )
      }

      const fileBuffer = await getFileVersionFromS3(
        `${fileId}.docx`,
        fileVersion?.s3VersionId
      )
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Disposition': `attachment; filename="${fileId}.docx"`,
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
      })
    }
  } catch (error) {
    logger.error(`error downloading file for file ${fileId}: ${error}`)
    return NextResponse.json(
      { error: 'Failed to generate blank docx' },
      { status: 500 }
    )
  }
}