/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const invoiceId = searchParams.get('invoiceId')

    if (!invoiceId) {
      return NextResponse.json(
        { message: 'Invoice ID is required' },
        { status: 400 }
      )
    }

    const invoice = await prisma.invoice.findUnique({
      where: {
        invoiceId: invoiceId,
      },
    })

    if (!invoice) {
      logger.error(`Invoice not found ${invoiceId}`)
      return NextResponse.json(
        { message: 'Invoice not found' },
        { status: 404 }
      )
    }

    const fileIds = invoice.itemNumber ? invoice.itemNumber.split(',') : []

    const filesWithInvoiceInfo = await prisma.invoiceFile.findMany({
      where: {
        fileId: {
          in: fileIds,
        },
      },
      include: {
        File: true,
      },
    })

    logger.info(`Invoice details fetched for ${invoiceId}`)

    const responseData = {
      success: true,
      data: {
        invoice: {
          invoiceId: invoice.invoiceId,
          amount: invoice.amount,
          discount: invoice.discount,
          fee: invoice.fee,
          status: invoice.status,
          paymentMethod: invoice.paymentMethod,
          transactionId: invoice.transactionId,
          creditsUsed: invoice.creditsUsed,
          refundAmount: invoice.refundAmount,
        },
        files: filesWithInvoiceInfo.map(({ File }) => File),
      },
    }

    return NextResponse.json(responseData)
  } catch (error) {
    logger.error(`Error fetching invoice details: ${error}`)
    return NextResponse.json(
      { message: 'Error fetching invoice details' },
      { status: 500 }
    )
  }
}
