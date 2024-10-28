import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { name, email } = await request.json()

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const existingOrganization = await prisma.organization.findFirst({
      where: {
        name: name.toUpperCase(),
        userId: user.id,
      },
    })

    if (existingOrganization) {
      return NextResponse.json(
        { error: 'Organization already added for this user' },
        { status: 400 }
      )
    }

    const newOrganization = await prisma.organization.create({
      data: {
        name: name.toUpperCase(),
        userId: user.id,
      },
    })

    return NextResponse.json(
      {
        message: 'Organization added successfully',
        organization: newOrganization,
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Error adding organization:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
