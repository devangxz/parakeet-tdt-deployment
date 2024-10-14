export const dynamic = 'force-dynamic'
import { Rating } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const fileId = searchParams.get('fileId')

  if (!fileId) {
    return NextResponse.json({ error: 'File ID is required' }, { status: 400 })
  }

  try {
    const ratingMap: { [key in Rating]: number } = {
      [Rating.POOR]: 1,
      [Rating.BAD]: 2,
      [Rating.OKAY]: 3,
      [Rating.GOOD]: 4,
      [Rating.EXCELLENT]: 5,
    }
    const order = await prisma.order.findUnique({
      where: { fileId: fileId as string },
      select: { rating: true },
    })
    if (!order) {
      return NextResponse.json(
        { message: `Order rating Not Found for file: ${fileId}` },
        { status: 404 }
      )
    }
    logger.info('<-- getOrderRatings')
    if (order && order.rating) {
      return NextResponse.json(
        { rating: ratingMap[order.rating] },
        { status: 200 }
      )
    } else {
      return NextResponse.json({ message: 'Order not found.' }, { status: 404 })
    }
  } catch (err) {
    return NextResponse.json(
      { message: 'Error getting order ratings' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { fileId, rating } = await req.json()
    const ratingMap: { [key: number]: Rating } = {
      1: Rating.POOR,
      2: Rating.BAD,
      3: Rating.OKAY,
      4: Rating.GOOD,
      5: Rating.EXCELLENT,
    }
    let mapRating: Rating

    if (rating in ratingMap) {
      mapRating = ratingMap[rating]
    } else {
      throw new Error('Invalid rating value')
    }
    const orderExist = await prisma.order.update({
      where: { fileId: fileId },
      data: {
        rating: mapRating,
      },
    })
    if (!orderExist) {
      return NextResponse.json(
        { message: `Order Not Found for file: ${fileId}` },
        { status: 404 }
      )
    }
    logger.info('<-- orderRatings')
    return NextResponse.json(
      { message: 'Thankyou for the feedback' },
      { status: 200 }
    )
  } catch (err) {
    return NextResponse.json(
      { message: 'Cannot submit your feedback' },
      { status: 500 }
    )
  }
}
