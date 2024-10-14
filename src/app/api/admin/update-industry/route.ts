/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
  const { id, industry } = await req.json()

  let filter = {}

  if (!isNaN(id)) {
    filter = { id: parseInt(id) }
  } else {
    filter = { email: id }
  }
  try {
    const user = await prisma.user.findUnique({
      where: filter as any,
      include: { Customer: true, Order: true, File: true },
    })

    if (!user) {
      logger.error(`User not found with id or email '${id}'`)
      return NextResponse.json({
        success: false,
        s: `User with id or email '${id}' does not exist`,
      })
    }

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        industry: industry,
      },
    })

    logger.info(`Updated Industry for ${user.email}, ${user.id}`)

    return NextResponse.json({
      success: true,
      message: 'Updated Industry successfully',
    })
  } catch (error) {
    logger.error(`Error updating industry`, error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again after some time.',
    })
  }
}
