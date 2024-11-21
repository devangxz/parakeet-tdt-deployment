import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAWSSesInstance } from '@/lib/ses'

export async function POST(req: NextRequest) {
  try {
    const { fileId, rate } = await req.json()
    const userHeader = req.headers.get('x-user-token')
    const user = JSON.parse(userHeader ?? '{}')

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

    await prisma.order.update({
      where: { fileId: fileId },
      data: { rateBonus: Number(rate), updatedAt: new Date() },
    })

    const awsSes = getAWSSesInstance()
    await awsSes.sendAlert(
      `File Bonus Updated`,
      `${fileInformation.fileId} file bonus updated to $${rate}/ah by ${user.email}`,
      'software'
    )

    logger.info(`rate bonus updated to $${rate}/ah, for ${fileId}`)
    return NextResponse.json({
      success: true,
      message: 'Bonus updated successfully',
    })
  } catch (error) {
    logger.error(`Failed to update bonus`, error)
    return NextResponse.json({
      success: false,
      message: 'An error occurred. Please try again after some time.',
    })
  }
}
