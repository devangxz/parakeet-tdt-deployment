import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
  const { invoiceId, optionId, value } = await req.json()

  if (!invoiceId || !optionId) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    )
  }
  try {
    const invoice = await prisma.invoice.findUnique({
      where: {
        invoiceId: invoiceId,
      },
    })

    if (!invoice) {
      logger.error(`Invoice not found ${invoiceId}`)
      return NextResponse.json(
        {
          success: false,
          message: 'Invoice not found.',
        },
        { status: 404 }
      )
    }

    let options = JSON.parse(invoice?.options ?? '')

    if (optionId === 'si') {
      options = {
        ...options,
        si: parseInt(value),
      }
    } else if (optionId === 'tmp') {
      options = {
        ...options,
        tmp: parseInt(value),
      }
    } else if (optionId === 'sp') {
      options = {
        ...options,
        sp: value,
      }
    }

    if (optionId === 'instructions') {
      const updatedInvoice = await prisma.invoice.update({
        where: {
          invoiceId: invoiceId,
        },
        data: {
          instructions: value,
        },
      })

      return NextResponse.json({
        success: true,
        invoice: updatedInvoice,
        message: 'Instructions updated successfully.',
      })
    }

    const updatedInvoice = await prisma.invoice.update({
      where: {
        invoiceId: invoiceId,
      },
      data: {
        options: JSON.stringify(options),
      },
    })

    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
      message: 'Options updated successfully.',
    })
  } catch (error) {
    logger.error(`Error updating order options for ${invoiceId}`, error)
    return NextResponse.json(
      { success: false, message: 'Error updating order options.' },
      { status: 500 }
    )
  }
}
