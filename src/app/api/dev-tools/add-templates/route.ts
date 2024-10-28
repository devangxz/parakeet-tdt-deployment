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

    const existingTemplate = await prisma.template.findFirst({
      where: {
        name,
        userId: user.id,
      },
    })

    if (existingTemplate) {
      return NextResponse.json(
        { error: 'Template already exists for this user' },
        { status: 400 }
      )
    }

    const newTemplate = await prisma.template.create({
      data: {
        name,
        userId: user.id,
      },
    })

    return NextResponse.json(
      {
        message: 'Template added successfully',
        template: newTemplate,
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Error adding template:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
