export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const fileId = searchParams.get('fileId')

  if (!fileId) {
    return NextResponse.json({ error: 'File ID is required' }, { status: 400 })
  }

  try {
    const order = await prisma.order.findFirst({
      where: { fileId: fileId as string },
      select: { comments: true },
    })
    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message: 'Order not found.',
        },
        { status: 404 }
      )
    } else {
      return NextResponse.json({ comments: order.comments }, { status: 200 })
    }
  } catch (err) {
    logger.error(`Failed to retrieve comments for file: ${fileId}`)
    return NextResponse.json(
      { message: 'Error retrieving comments' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const { fileId, comments } = await req.json()
  try {
    const orderExist = await prisma.order.update({
      where: { fileId: fileId },
      data: {
        comments,
      },
    })
    if (!orderExist) {
      return NextResponse.json(
        { message: `Order Not Found for file: ${fileId}` },
        { status: 404 }
      )
    }
    logger.info('<-- orderComments')
    return NextResponse.json(
      { message: 'Thankyou for your comments' },
      { status: 200 }
    )
  } catch (err) {
    logger.error(`Failed to add comments for file: ${fileId}`)
    return NextResponse.json(
      { message: 'Cannot submit your comments' },
      { status: 500 }
    )
  }
}
