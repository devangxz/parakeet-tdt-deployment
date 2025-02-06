'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getUserInfo } from '@/services/user-service/get-user-info'

export async function getPersonalInfo() {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    const userId = user?.internalTeamUserId || user?.userId

    if (!userId) {
      return {
        success: false,
        message: 'User not authenticated',
      }
    }

    const result = await getUserInfo(userId)
    return {
      success: true,
      data: result,
    }
  } catch (error) {
    logger.error('Error fetching user info:', error)
    return {
      success: false,
      message: 'SCB_GET_USER_INFO_FAILED',
    }
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

export async function updatePersonalInfo(payload: UpdatePersonalInfoPayload) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    const userId = user?.internalTeamUserId || user?.userId

    if (!userId) {
      return {
        success: false,
        message: 'User not authenticated',
      }
    }

    logger.info('--> updateUserInfo')

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
      return {
        success: false,
        message: 'SCB_UPDATE_USER_INFO_USER_NOT_FOUND',
      }
    }

    return {
      success: true,
      message: 'SCB_UPDATE_USER_INFO_SUCCESS',
    }
  } catch (err) {
    logger.error(`Error: ${err}`)
    return {
      success: false,
      message: 'SCB_UPDATE_USER_INFO_FAILED',
    }
  }
}
