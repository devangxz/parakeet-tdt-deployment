export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getUserInfo } from '@/services/user-service/get-user-info'

export async function GET(req: NextRequest) {
  const userToken = req.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')
  const userId = user?.internalTeamUserId || user?.userId

  try {
    const result = await getUserInfo(userId)
    return NextResponse.json(result, { status: result.statusCode })
  } catch (error) {
    console.error('Error fetching user info:', error)
    return NextResponse.json(
      { message: 'SCB_GET_USER_INFO_FAILED' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const userToken = req.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')
  const userId = user?.internalTeamUserId || user?.userId

  const { payload } = await req.json()

  logger.info('--> updateUserInfo')
  try {
    const data = {
      firstname: payload.firstName,
      lastname: payload.lastName,
      phoneNumber: payload.phone,
      country: payload.country,
      state: payload.state,
      city: payload.city,
      postalCode: payload.postalCode,
      address1: payload.add1,
      address2: payload.add2,
      industry: payload.industry,
    }
    const userUpdate = await prisma.user.update({
      where: { id: userId },
      data: data,
    })
    if (!userUpdate) {
      return NextResponse.json({
        message: 'SCB_UPDATE_USER_INFO_USER_NOT_FOUND',
        statusCode: 404,
      })
    }
    return NextResponse.json({
      message: 'SCB_UPDATE_USER_INFO_SUCCESS',
      statusCode: 200,
    })
  } catch (err) {
    logger.error(`Error: ${err}`)
    return NextResponse.json({
      message: 'SCB_UPDATE_USER_INFO_FAILED',
      statusCode: 500,
    })
  }
}
