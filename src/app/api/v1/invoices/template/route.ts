import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { invoiceId, templateId } = await req.json()

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

    const options = JSON.parse(invoice.options ?? '{}')
    options.tmp = Number(templateId)
    await prisma.invoice.update({
      where: { invoiceId },
      data: { options: JSON.stringify(options) },
    })

    return NextResponse.json({
      success: true,
      message: 'Successfully updated invoice template',
    })
  } catch (error) {
    logger.error(`Failed to update invoice template: ${error}`)
    return NextResponse.json(
      { message: 'Error updating invoice template' },
      { status: 500 }
    )
  }
}
