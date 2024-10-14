import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const userToken = req.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')
  const userId = user?.internalTeamUserId || user?.userId
  const { invoiceId } = await req.json()

  try {
    const invoice = await prisma.invoice.findUnique({
      where: {
        invoiceId,
      },
    })

    if (!invoice) {
      logger.error(`Invoice not found ${invoiceId}`)
      return NextResponse.json(
        { success: false, message: 'Invoice not found.' },
        { status: 404 }
      )
    }

    if (invoice.userId !== userId) {
      logger.error(`Unauthorized access to delete invoice ${invoiceId}`)
      return NextResponse.json(
        { success: false, message: 'Unauthorized access.' },
        { status: 401 }
      )
    }

    await prisma.invoice.delete({
      where: {
        invoiceId,
      },
    })

    logger.info(`Invoice deleted ${invoiceId}`)
    return NextResponse.json(
      { success: true, s: 'Successfully deleted invoice' },
      { status: 200 }
    )
  } catch (error) {
    logger.error(
      `failed to delete invoice ${invoiceId} for ${userId}: ${error}`
    )
    return NextResponse.json({
      success: false,
      message: 'An error occurred. Please try again after some time.',
    })
  }
}
