import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'
import { getUserInfo } from '@/services/user-service/get-user-info'

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const result = await getUserInfo(user.userId)
    return NextResponse.json({
      success: true,
      data: {
        email: result.info?.email,
        firstname: result.info?.firstname,
        lastname: result.info?.lastname,
        address1: result.info?.address1,
        address2: result.info?.address2,
        city: result.info?.city,
        state: result.info?.state,
        country: result.info?.country,
        postalCode: result.info?.postalCode,
        phoneNumber: result.info?.phoneNumber,
        referralCode: result.info?.referralCode,
        paypalId: result.info?.paypalId,
        secondaryEmail: result.secondaryEmail?.secondaryEmail,
        splInstructions: result.info?.splInstructions,
        industry: result.info?.industry,
      },
    })
  } catch (error) {
    logger.error('Error fetching user info:', error)
    return NextResponse.json(
      { message: 'Failed to fetch user info' },
      { status: 500 }
    )
  }
}

interface UpdatePersonalInfoPayload {
  firstName: string
  lastName: string
  phone: string
  country?: string
  state?: string
  city?: string
  postalCode?: string
  add1?: string
  add2?: string
  industry?: string
}

export async function PUT(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const payload = (await req.json()) as UpdatePersonalInfoPayload

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
      where: { id: user.userId },
      data: data,
    })

    if (!userUpdate) {
      return NextResponse.json(
        { message: 'Failed to update user info' },
        { status: 404 }
      )
    }

    return NextResponse.json('User info updated successfully')
  } catch (err) {
    logger.error(`Error: ${err}`)
    return NextResponse.json(
      { message: 'Failed to update user info' },
      { status: 500 }
    )
  }
}
