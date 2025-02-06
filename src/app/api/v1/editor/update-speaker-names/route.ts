import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const auth = authHeader?.split(' ')
    const auth_key = auth && auth[0] === 'Basic' && auth[1] ? auth[1] : null

    if (!auth_key || auth_key !== process.env.SCRIBIE_API_KEY) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized',
      })
    }

    const { speakerName, fileId } = await req.json()

    const invoiceFile = await prisma.invoiceFile.findFirst({
      where: {
        fileId: fileId,
      },
      select: {
        invoiceId: true,
      },
    })

    if (!invoiceFile) {
      logger.error(`Invoice not found for file ${fileId}`)
      return NextResponse.json({
        success: false,
        error: 'Invoice not found',
      })
    }

    const currentInvoice = await prisma.invoice.findUnique({
      where: {
        invoiceId: invoiceFile.invoiceId,
      },
      select: {
        options: true,
      },
    })

    if (!currentInvoice) {
      logger.error(`Invoice not found for file ${fileId}`)
      return NextResponse.json({
        success: false,
        error: 'Invoice not found',
      })
    }

    const currentOptions = JSON.parse(currentInvoice.options || '{}')
    const updatedOptions = {
      ...currentOptions,
      sn: {
        ...currentOptions.sn,
        [fileId]: speakerName,
      },
    }

    await prisma.invoice.update({
      where: {
        invoiceId: invoiceFile.invoiceId,
      },
      data: {
        options: JSON.stringify(updatedOptions),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Successfully updated speaker name',
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'An internal server error occurred.',
    })
  }
}
