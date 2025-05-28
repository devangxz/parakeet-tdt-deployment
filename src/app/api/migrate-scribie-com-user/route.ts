/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { generateUniqueId } from '@/utils/generateUniqueId'

const createUser = async (userData: any) => {
  const newUser = await prisma.user.create({
    data: userData,
  })
  await prisma.customer.create({
    data: {
      userId: newUser.id,
    },
  })
  await prisma.customerNotifyPrefs.create({
    data: {
      userId: newUser.id,
      newsletter: true,
    },
  })
  return newUser
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const auth = authHeader?.split(' ')
    const auth_key = auth && auth[0] === 'Basic' && auth[1] ? auth[1] : null

    if (!auth_key || auth_key !== process.env.SCRIBIE_API_KEY) {
      logger.error('Unauthorized API key for user migration')
      return NextResponse.json({
        success: false,
        message: 'Unauthorized',
      })
    }

    const body = await req.json()
    const { email, password, firstname, lastname, phone, industry, id } = body
    let internalApiKey: string

    if (!email || !password || !firstname || !lastname) {
      logger.error('Missing required fields for user migration')
      return NextResponse.json({
        success: false,
        message: 'Missing required fields',
      })
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email: email.toLowerCase(),
      },
      include: {
        ApiKey: true,
      },
    })

    if (existingUser) {
      if (existingUser?.ApiKey && existingUser.ApiKey.internalApiKey) {
        internalApiKey = existingUser.ApiKey.internalApiKey
      } else {
        internalApiKey = generateUniqueId()

        if (existingUser?.ApiKey && existingUser.ApiKey.apiKey) {
          await prisma.apiKey.update({
            where: {
              id: existingUser.ApiKey.id,
            },
            data: {
              internalApiKey,
            },
          })
        } else {
          const apiKey = generateUniqueId()
          await prisma.apiKey.create({
            data: {
              userId: existingUser.id,
              apiKey,
              internalApiKey,
            },
          })
        }
      }
    } else {
      const userResult = await createUser({
        email: email.toLowerCase(),
        pass: password,
        salt: 'Test@123',
        firstname,
        lastname,
        role: 'CUSTOMER',
        phoneNumber: phone || '',
        industry: industry || '',
        referralCode: generateUniqueId(),
        id,
      })

      if (!userResult) {
        logger.error(`Failed to create user during migration`)
        return NextResponse.json({
          success: false,
          message: 'Failed to create user during migration',
        })
      }

      const user = userResult

      const userWithApiKey = await prisma.user.findUnique({
        where: {
          id: user.id,
        },
        include: {
          ApiKey: true,
        },
      })

      if (userWithApiKey?.ApiKey && userWithApiKey.ApiKey.internalApiKey) {
        internalApiKey = userWithApiKey.ApiKey.internalApiKey
      } else {
        internalApiKey = generateUniqueId()

        if (userWithApiKey?.ApiKey && userWithApiKey.ApiKey.apiKey) {
          await prisma.apiKey.update({
            where: {
              id: userWithApiKey.ApiKey.id,
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
      }
    }

    logger.info(`Successfully migrated user and retrieved API key for ${email}`)

    return NextResponse.json({
      success: true,
      message: 'User migrated successfully',
      apiKey: internalApiKey,
    })
  } catch (error) {
    logger.error('Error migrating user:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal Server Error',
    })
  }
}
