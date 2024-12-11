/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import logger from '@/lib/logger'
import {
  getCustomPlanDetails,
  updateCustomPlan,
} from '@/services/admin/custom-plan-service'

export async function getCustomPlanDetailsAction(userEmail: string) {
  try {
    const response = await getCustomPlanDetails({ userEmail })
    return response
  } catch (error) {
    logger.error(`Error while fetching custom plan details`, error)
    return {
      success: false,
      s: 'An error occurred. Please try again after some time.',
    }
  }
}

export async function updateCustomPlanAction(userEmail: string, rates: any) {
  try {
    const response = await updateCustomPlan({ userEmail, rates })
    return response
  } catch (error) {
    logger.error(`Error while updating custom plan`, error)
    return {
      success: false,
      s: 'An error occurred. Please try again after some time.',
    }
  }
}
