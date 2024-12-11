'use server'

import logger from '@/lib/logger'
import { getUserInfo } from '@/services/admin/user-info-service'

export async function getUserInfoAction(id: string) {
  try {
    const response = await getUserInfo({ id })
    return response
  } catch (error) {
    logger.error(`Error while fetching user info`, error)
    return {
      success: false,
      s: 'An error occurred. Please try again after some time.',
    }
  }
}
