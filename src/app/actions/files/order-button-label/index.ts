'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getTeamAdminUserDetails } from '@/utils/backend-helper'

export async function getOrderButtonLabel() {
  const session = await getServerSession(authOptions)
  const user = session?.user

  if (!user) {
    return {
      success: false,
      label: 'Transcribe',
    }
  }

  try {
    const teamAdminDetails = await getTeamAdminUserDetails(user.userId)
    const customerId = teamAdminDetails ? teamAdminDetails.userId : user.userId

    const customPlan = await prisma.userRate.findUnique({
      where: {
        userId: customerId,
      },
    })

    if (!customPlan) {
      return {
        success: true,
        label: 'Transcribe',
      }
    }

    if (customPlan.orderType !== 'TRANSCRIPTION') {
      return {
        success: true,
        label: customPlan.defaultOrderButtonLabel || 'Format',
      }
    }

    return {
      success: true,
      label: 'Transcribe',
    }
  } catch (error) {
    logger.error('Failed to get order button label', error)
    return {
      success: false,
      label: 'Transcribe',
    }
  }
}
