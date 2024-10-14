import { InvoiceType } from '@prisma/client'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { generateInvoiceId } from '@/utils/backend-helper'

export async function POST(req: Request) {
  const { type, fileIds, userId, rate } = await req.json()
  let price = 0
  const minAmount = 1

  try {
    if (
      type === InvoiceType.ADDL_FORMATTING ||
      type === InvoiceType.ADDL_PROOFREADING
    ) {
      const fileIdsArray = fileIds.split(',')
      const deliveredOrders = await prisma.order.findMany({
        where: {
          fileId: {
            in: fileIdsArray,
          },
          status: 'DELIVERED',
        },
      })
      if (deliveredOrders.length !== 0) {
        return NextResponse.json({
          success: false,
          message:
            'Additional Proofreading invoice can not be generated for delivered file',
        })
      }
    }
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        itemNumber: fileIds,
        type: type,
      },
    })

    if (existingInvoice) {
      return NextResponse.json({
        success: true,
        invoiceId: existingInvoice.invoiceId,
      })
    }

    const files = await prisma.file.findMany({
      where: {
        fileId: {
          in: fileIds.split(','),
        },
      },
    })

    if (files.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Files not found',
      })
    }

    for (const file of files) {
      const amount =
        (file.duration / 60) * rate < minAmount
          ? minAmount
          : (file.duration / 60) * rate
      price += amount
    }

    const invoiceId = generateInvoiceId('CGAP')

    const invoice = await prisma.invoice.create({
      data: {
        invoiceId,
        userId: parseInt(userId),
        type,
        amount: price,
        itemNumber: fileIds,
      },
    })

    logger.info(`Invoice generated successfully for ${userId}, ${invoiceId}`)

    return NextResponse.json({
      success: true,
      invoiceId: invoice.invoiceId,
    })
  } catch (error) {
    logger.error(`Error generating invoice`, error)
    return NextResponse.json({
      success: false,
      message: 'An error occurred. Please try again after some time.',
    })
  }
}
