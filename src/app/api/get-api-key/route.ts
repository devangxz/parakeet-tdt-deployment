import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { generateUniqueId } from '@/utils/generateUniqueId'

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email') ?? ''
  try {
    const authHeader = req.headers.get('authorization')
    const auth = authHeader?.split(' ')
    const auth_key = auth && auth[0] === 'Basic' && auth[1] ? auth[1] : null

    if (!auth_key || auth_key !== process.env.SCRIBIE_API_KEY) {
      logger.error(`Unauthorized API key retrieval for email ${email}`)
      return NextResponse.json({
        success: false,
        message: 'Unauthorized',
      })
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

      return NextResponse.json({
        success: false,
        message: 'User not found',
      })
    }

    if (user.role === 'ADMIN' || user.role === 'OM') {
      logger.error(`Preventing admin access ${email}`)
      return NextResponse.json({
        success: false,
        message: 'User not found',
      })
    }

    logger.info(`Successfully retrieved API key for user ${user.email}`)

    if (user.ApiKey && user.ApiKey.internalApiKey) {
      return NextResponse.json({
        success: true,
        apiKey: user.ApiKey.internalApiKey,
      })
    } else {
      const internalApiKey = generateUniqueId()
      if (user.ApiKey && user.ApiKey.apiKey) {
        await prisma.apiKey.update({
          where: {
            id: user.ApiKey.id,
          },
          data: {
            internalApiKey,
          },
        })
      } else {
        const apiKey = generateUniqueId()
        await prisma.apiKey.create({
          data: {
            userId: user.id,
            apiKey,
            internalApiKey,
          },
        })
      }
      return NextResponse.json({ success: true, apiKey: internalApiKey })
    }
  } catch (error) {
    logger.error(`Error retrieving API key for user ${email}`, error)
    return NextResponse.json({
      success: false,
      message: 'Internal Server Error',
    })
  }
}
