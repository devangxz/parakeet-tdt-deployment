import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getTeamAdminUserDetails } from '@/utils/backend-helper'

const getCustomFormatOption = async (userId: number) => {
  try {
    const teamAdminDetails = await getTeamAdminUserDetails(userId)
    let teamUserId = null
    if (!teamAdminDetails) {
      teamUserId = userId
    } else {
      teamUserId = teamAdminDetails.userId
    }

    const customPlan = await prisma.userRate.findUnique({
      where: {
        userId: teamUserId,
      },
    })

    return customPlan?.customFormatOption ?? ''
  } catch (error) {
    logger.error(`Error while getting the custom format option`, error)
    return ''
  }
}

export default getCustomFormatOption
