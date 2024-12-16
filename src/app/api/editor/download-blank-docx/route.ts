export const dynamic = 'force-dynamic'
import { FileTag, OrderStatus, OrderType } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getFileVersionFromS3, getFileVersionSignedURLFromS3 } from '@/utils/backend-helper'

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

      const signedUrl = await getFileVersionSignedURLFromS3(
        `${fileId}.docx`,
        fileVersion?.s3VersionId
      )

      return NextResponse.json({ url: signedUrl })

    } else if (order.status === OrderStatus.REVIEWER_ASSIGNED) {
      if (type === 'no-marking') {
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

        const signedUrl = await getFileVersionSignedURLFromS3(`${fileId}.txt`, fileVersion?.s3VersionId)
        return NextResponse.json({ url: signedUrl })
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

      const signedUrl = await getFileVersionSignedURLFromS3(
        `${fileId}.docx`,
        fileVersion?.s3VersionId
      )

      return NextResponse.json({ url: signedUrl })
    }
  } catch (error) {
    logger.error(`error downloading file for file ${fileId}: ${error}`)
    return NextResponse.json(
      { error: 'Failed to generate blank docx' },
      { status: 500 }
    )
  }
}
