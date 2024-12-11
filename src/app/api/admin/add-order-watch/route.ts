import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import { updateOrderWatch } from '@/services/admin/order-watch-service'

export async function POST(req: Request) {
  try {
    const { userEmail, flag } = await req.json()
    const response = await updateOrderWatch({ userEmail, flag })
    return NextResponse.json(response)
  } catch (error) {
    logger.error(`Error while updating order watch`, error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again after some time.',
    })
  }
}
