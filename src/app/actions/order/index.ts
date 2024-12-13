'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import { orderFiles } from '@/services/order-service'

export async function createOrder(fileIds: string[], orderType: string) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user

    if (!user) {
      return {
        success: false,
        message: 'Unauthorized',
      }
    }

    const userId = user.internalTeamUserId || user.userId
    const customPlan = user?.customPlan as unknown as boolean

    const response = await orderFiles(
      userId,
      user.internalTeamUserId,
      fileIds,
      orderType,
      customPlan
    )

    return response
  } catch (error) {
    logger.error('Error processing order:', error)
    return {
      success: false,
      message: 'Error processing order',
    }
  }
}
