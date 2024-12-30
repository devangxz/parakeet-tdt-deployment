export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'

const customerRoles = [
  'CUSTOMER',
  'ADMIN',
  'INTERNAL_TEAM_USER',
  'SUPERADMIN',
  'CSADMIN',
  'OM',
]

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const preferences = customerRoles.includes(user.role)
      ? await prisma.customerNotifyPrefs.findUnique({
          where: { userId: user.userId },
        })
      : await prisma.transcriberNotifyPrefs.findUnique({
          where: { userId: user.userId },
        })

    const userSettings = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { recordsPerPage: true },
    })

    return NextResponse.json({
      preferences,
      recordsPerPage: userSettings?.recordsPerPage,
    })
  } catch (error) {
    logger.error('Error fetching user preferences:', error)
    return NextResponse.json(
      { message: 'Failed to fetch user preferences' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json(
        { message: 'User not authenticated' },
        { status: 401 }
      )
    }

    const { preferences, recordsPerPage } = await req.json()

    if (!preferences || typeof preferences !== 'object') {
      return NextResponse.json(
        { message: 'Preferences are required' },
        { status: 400 }
      )
    }

    const payload = {
      ...preferences,
      userId: user.userId,
    }

    const updateNotifyPrefs = customerRoles.includes(user.role)
      ? prisma.customerNotifyPrefs.upsert({
          where: { userId: user.userId },
          update: payload,
          create: payload,
        })
      : prisma.transcriberNotifyPrefs.upsert({
          where: { userId: user.userId },
          update: payload,
          create: payload,
        })

    const updateUser = prisma.user.update({
      where: { id: user.userId },
      data: { recordsPerPage },
    })

    await prisma.$transaction([updateNotifyPrefs, updateUser])

    return NextResponse.json('Preferences updated successfully')
  } catch (err) {
    logger.error(`Error handling default order preferences: ${err}`)
    return NextResponse.json(
      { message: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}
