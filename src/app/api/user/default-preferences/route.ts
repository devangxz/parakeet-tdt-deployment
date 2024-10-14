import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

const customerRoles = [
  'CUSTOMER',
  'ADMIN',
  'INTERNAL_TEAM_USER',
  'SUPERADMIN',
  'CSADMIN',
  'OM',
]

export async function POST(req: NextRequest) {
  const { preferences, recordsPerPage } = await req.json()
  const userToken = req.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')
  const userId = user?.internalTeamUserId || user?.userId
  if (!preferences || typeof preferences !== 'object') {
    return NextResponse.json(
      { message: 'SCB_DEFAULT_ORDER_PREFERENCES_EMPTY' },
      { status: 400 }
    )
  }

  try {
    const payload = {
      ...preferences,
      userId,
    }

    const updateNotifyPrefs = customerRoles.includes(user?.role)
      ? prisma.customerNotifyPrefs.upsert({
          where: { userId },
          update: payload,
          create: payload,
        })
      : prisma.transcriberNotifyPrefs.upsert({
          where: { userId },
          update: payload,
          create: payload,
        })
    const updateUser = prisma.user.update({
      where: { id: userId },
      data: { recordsPerPage: recordsPerPage },
    })
    await prisma.$transaction([updateNotifyPrefs, updateUser])
    return NextResponse.json({
      message: 'SCB_DEFAULT_ORDER_PREFERENCES_SUCCESS',
      statusCode: 200,
    })
  } catch (err) {
    logger.error(`Error handling default order preferences: ${err}`)
    return NextResponse.json({
      message: 'SCB_DEFAULT_ORDER_PREFERENCES_SAVE_FAILED',
      statusCode: 500,
    })
  }
}
