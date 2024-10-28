import { InputFileType, OrderStatus } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import assignFileToFinalizer from '@/services/transcribe-service/assign-file-to-finalizer'

export async function POST(req: NextRequest) {
  try {
    const { fileId, userEmail } = await req.json()

    if (!fileId) {
      return NextResponse.json({
        success: false,
        message: 'File Id parameter is required.',
      })
    }

    const orderInformation = await prisma.order.findUnique({
      where: { fileId: fileId },
    })

    if (!orderInformation) {
      logger.error(`File not found for ${fileId}`)
      return NextResponse.json({ success: false, message: 'File not found' })
    }

    if (orderInformation.status !== OrderStatus.REVIEW_COMPLETED) {
      logger.error(
        `Finalizer can be assigned to ${orderInformation.status} file ${fileId}`
      )
      return NextResponse.json({
        success: false,
        message: 'Finalizer can only be assigned to review completed files.',
      })
    }

    const user = await prisma.user.findUnique({
      where: { email: userEmail.toLowerCase() },
    })

    if (!user) {
      logger.error(`User not found for ${userEmail}`)
      return NextResponse.json({ message: 'User not found' })
    }

    await assignFileToFinalizer(
      orderInformation.id,
      fileId,
      user.id,
      InputFileType.LLM_OUTPUT
    )

    logger.info(`Successfully assigned finalizer for file ${fileId}`)
    return NextResponse.json({
      success: true,
      message: 'Successfully assigned finalier file',
    })
  } catch (error) {
    logger.error(`Failed to assign finalizer`, error)
    return NextResponse.json({
      success: false,
      message: 'An error occurred. Please try again after some time.',
    })
  }
}
