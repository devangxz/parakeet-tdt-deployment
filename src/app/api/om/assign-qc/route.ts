import { JobType, OrderStatus, InputFileType } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import assignFileToQC from '@/services/transcribe-service/assign-file-to-qc'

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

    if (orderInformation.status !== OrderStatus.TRANSCRIBED) {
      logger.error(
        `QC can be assigned to ${orderInformation.status} file ${fileId}`
      )
      return NextResponse.json({
        success: false,
        message: 'QC can only be assigned to transcribed files.',
      })
    }

    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    })

    if (!user) {
      logger.error(`User not found for ${userEmail}`)
      return NextResponse.json({ success: false, message: 'User not found' })
    }

    await assignFileToQC(
      orderInformation.id,
      OrderStatus.QC_ASSIGNED,
      user.id,
      JobType.QC,
      InputFileType.ASR_OUTPUT,
      fileId
    )

    logger.info(`Successfully un-assigned qc for file ${fileId}`)
    return NextResponse.json({
      success: true,
      message: 'Successfully assigned qc file',
    })
  } catch (error) {
    logger.error(`Failed to assign qc`, error)
    return NextResponse.json({
      success: false,
      message: 'An error occurred. Please try again after some time.',
    })
  }
}
