import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import deliver from '@/services/file-service/deliver'

export async function POST(req: NextRequest) {
  const userToken = req.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')
  const omId = user?.userId
  try {
    const { orderId } = await req.json()

    if (!orderId) {
      return NextResponse.json({
        success: false,
        message: 'Order Id parameter is required.',
      })
    }

    const orderInformation = await prisma.order.findUnique({
      where: { id: Number(orderId) },
    })

    if (!orderInformation) {
      logger.error(`Order not found for ${orderId}`)
      return NextResponse.json({ success: false, message: 'Order not found' })
    }

    await deliver(orderInformation, omId)

    logger.info(
      `Successfully delivered pre delivery file ${orderId} by user ${user?.user}`
    )
    return NextResponse.json({
      success: true,
      message: 'Successfully delivered file',
    })
  } catch (error) {
    logger.error(`Failed to deliver pre delivery file`, error)
    return NextResponse.json({
      success: false,
      message: 'An error occurred. Please try again after some time.',
    })
  }
}
