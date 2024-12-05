import { JobStatus, JobType, InputFileType } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import assignFileToFinalizer from '@/services/transcribe-service/assign-file-to-finalizer'

export async function POST(req: NextRequest) {
  try {
    const { orderId, userEmail, retainEarnings, isCompleted } = await req.json()

    if (!orderId) {
      return NextResponse.json({
        success: false,
        message: 'Order Id parameter is required.',
      })
    }

    const orderInformation = await prisma.order.findUnique({
      where: { id: Number(orderId) },
    })

    if (!orderInformation) {
      logger.error(`Order not found for ${orderId}`)
      return NextResponse.json({ success: false, message: 'Order not found' })
    }

    const currentJobAssignment = await prisma.jobAssignment.findFirst({
      where: {
        orderId: orderInformation.id,
        status: isCompleted ? JobStatus.COMPLETED : JobStatus.ACCEPTED,
        type: JobType.FINALIZE,
      },
    })

    if (!currentJobAssignment) {
      logger.error(`No job assignment found for ${orderId}`)
      return NextResponse.json({
        success: false,
        message: 'No job assignment found',
      })
    }

    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    })

    if (!user) {
      logger.error(`User not found for ${userEmail}`)
      return NextResponse.json({ success: false, message: 'User not found' })
    }

    await assignFileToFinalizer(
      Number(orderId),
      orderInformation.fileId,
      user.id,
      InputFileType.REVIEW_OUTPUT
    )

    await prisma.jobAssignment.update({
      where: { id: currentJobAssignment.id },
      data: {
        status: retainEarnings ? JobStatus.COMPLETED : JobStatus.REJECTED,
        ...(retainEarnings
          ? { completedTs: new Date() }
          : { cancelledTs: new Date() }),
      },
    })

    logger.info(`Successfully re-assigned finalizer for file ${orderId}`)
    return NextResponse.json({
      success: true,
      message: 'Successfully re-assigned finalizer',
    })
  } catch (error) {
    logger.error(`Failed to re-assign finalizer`, error)
    return NextResponse.json({
      success: false,
      message: 'An error occurred. Please try again after some time.',
    })
  }
}
