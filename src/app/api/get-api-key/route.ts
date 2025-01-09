import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { generateUniqueId } from '@/utils/generateUniqueId'

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email') ?? ''
  console.log('Fgbgnbgfbnfkgbgf')
  try {
    const authHeader = req.headers.get('authorization')
    const auth = authHeader?.split(' ')
    const auth_key = auth && auth[0] === 'Basic' && auth[1] ? auth[1] : null

    if (!auth_key || auth_key !== process.env.SCRIBIE_API_KEY) {
      logger.error(`Unauthorized API key retrieval for email ${email}`)
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
      include: {
        ApiKey: true,
      },
    })

    if (!user) {
      logger.error(`User not found for API key retrieval for email ${email}`)
      return new NextResponse('User not found', { status: 404 })
    }

    logger.info(`Successfully retrieved API key for user ${user.email}`)

    if (user.ApiKey) {
      return NextResponse.json({
        apiKey: user.ApiKey.apiKey,
      })
    } else {
      const apiKey = generateUniqueId()
      await prisma.apiKey.create({
        data: {
          userId: user.id,
          apiKey,
        },
      })
      return NextResponse.json({ apiKey })
    }
  } catch (error) {
    logger.error(`Error retrieving API key for user ${email}`, error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}
