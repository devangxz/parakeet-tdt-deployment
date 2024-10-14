import { NextResponse } from 'next/server'

import { orderFiles } from '@/services/order-service'

export async function POST(req: Request) {
  try {
    const userToken = req.headers.get('x-user-token')
    const user = JSON.parse(userToken ?? '{}')
    const { fids, orderType } = await req.json()
    const fileIds = fids.split(',')
    const userId = user?.internalTeamUserId || user?.userId
    const customPlan = user?.customPlan

    const response = await orderFiles(
      userId,
      user?.internalTeamUserId,
      fileIds,
      orderType,
      customPlan
    )
    return NextResponse.json(response)
  } catch (error) {
    console.error('Error processing order:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
