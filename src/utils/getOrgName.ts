import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getTeamAdminUserDetails } from '@/utils/backend-helper'

const getOrgName = async (userId: number) => {
  try {
    const teamAdminDetails = await getTeamAdminUserDetails(userId)
    let teamUserId = null
    if (!teamAdminDetails) {
      teamUserId = userId
    } else {
      teamUserId = teamAdminDetails.userId
    }

    const organization = await prisma.organization.findFirst({
      where: {
        userId: teamUserId,
      },
    })

    return organization?.name || ''
  } catch (error) {
    logger.error(`Error while getting the org name`, error)
    return ''
  }
}

export default getOrgName
