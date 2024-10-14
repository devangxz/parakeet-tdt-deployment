import { JobStatus, JobType, OrderStatus } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import unAssignFileFromTranscriber from '@/services/transcribe-service/unassign-file-from-transcriber'

export async function POST(req: NextRequest) {
  try {
    const { fileId } = await req.json()

    if (!fileId) {
      return NextResponse.json({
        success: false,
        message: 'File Id parameter is required.',
      })
    }

    const fileInformation = await prisma.file.findUnique({
      where: { fileId: fileId },
    })

    if (!fileInformation) {
      logger.error(`File not found for ${fileId}`)
      return NextResponse.json({
        success: false,
        message: 'File not found',
      })
    }

    const orderInformation = await prisma.order.findUnique({
      where: { fileId: fileId },
    })

    if (!orderInformation) {
      logger.error(`Order not found for ${fileId}`)
      return NextResponse.json({
        success: false,
        message: 'Order not found',
      })
    }

    const assignment = await prisma.jobAssignment.findFirst({
      where: {
        orderId: orderInformation.id,
        status: {
          in: [JobStatus.ACCEPTED, JobStatus.COMPLETED],
        },
        type: JobType.QC,
      },
    })

    if (!assignment) {
      logger.error(`No assignment found for ${fileId}`)
      return NextResponse.json({
        success: false,
        message: 'Assignment not found',
      })
    }

    await unAssignFileFromTranscriber(
      orderInformation.id,
      assignment.id,
      OrderStatus.TRANSCRIBED,
      JobStatus.CANCELLED,
      assignment.transcriberId,
      fileId,
      'QC'
    )

    logger.info(`Successfully un-assigned qc for file ${fileId}`)
    return NextResponse.json({
      success: true,
      message: 'Successfully un-assigned',
    })
  } catch (error) {
    logger.error(`Failed to unassign qc`, error)
    return NextResponse.json({
      success: false,
      message: 'An error occurred. Please try again after some time.',
    })
  }
}
