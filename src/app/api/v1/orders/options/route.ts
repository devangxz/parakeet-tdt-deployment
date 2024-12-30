export const dynamic = 'force-dynamic'
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

    const orderId = req.nextUrl.searchParams.get('orderId')
    if (!orderId) {
      return NextResponse.json(
        { message: 'Order ID is required' },
        { status: 400 }
      )
    }

    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
    })

    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 })
    }

    const invoiceFile = await prisma.invoiceFile.findFirst({
      where: { fileId: order.fileId },
    })

    if (!invoiceFile) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 })
    }

    const invoice = await prisma.invoice.findUnique({
      where: { invoiceId: invoiceFile.invoiceId },
    })

    if (!invoice) {
      return NextResponse.json(
        { message: 'Invoice not found' },
        { status: 404 }
      )
    }

    const options = JSON.parse(invoice.options ?? '{}')

    logger.info(`Retrieved order options for user ${user.userId}`)

    return NextResponse.json({
      success: true,
      data: {
        speaker_tracking: options.sif,
        speaker_initial: options.si,
        template: options.tmp,
        language: options.sp,
        audio_time_coding: options.ts,
        rush_order: options.exd,
        strict_verbatim: options.vb,
        subtitle_file: options.sub,
      },
    })
  } catch (error) {
    logger.error(`Failed to get order options: ${error}`)
    return NextResponse.json(
      { message: 'Failed to get order options' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const options = await req.json()

    const order = await prisma.order.findUnique({
      where: { id: Number(options.orderId) },
    })

    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 })
    }

    const invoiceFile = await prisma.invoiceFile.findFirst({
      where: { fileId: order.fileId },
    })

    if (!invoiceFile) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 })
    }

    const invoice = await prisma.invoice.findUnique({
      where: { invoiceId: invoiceFile.invoiceId },
    })

    if (!invoice) {
      return NextResponse.json(
        { message: 'Invoice not found' },
        { status: 404 }
      )
    }

    const newOptions = {
      ...JSON.parse(invoice.options ?? '{}'),
      sif: options.speaker_tracking ? 1 : 0,
      si: options.speaker_initial,
      tmp: options.template,
      sp: options.language,
      ts: options.audio_time_coding ? 1 : 0,
      exd: options.rush_order ? 1 : 0,
      sub: options.subtitle_file ? 1 : 0,
    }

    await prisma.invoice.update({
      where: { invoiceId: invoice.invoiceId },
      data: { options: JSON.stringify(newOptions) },
    })

    return NextResponse.json({
      message: 'Successfully saved order options',
    })
  } catch (err) {
    logger.error(`Error handling order options: ${err}`)
    return NextResponse.json(
      {
        message: 'Failed to save order options',
      },
      { status: 500 }
    )
  }
}
