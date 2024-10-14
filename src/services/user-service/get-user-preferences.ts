import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export const getDefaultPreferences = async (userId: number, role: string) => {
  logger.info('--> getDefaultPreferences')
  const customerRoles = [
    'CUSTOMER',
    'ADMIN',
    'INTERNAL_TEAM_USER',
    'SUPERADMIN',
    'CSADMIN',
    'OM',
  ]
  try {
    const defaultPreferences = customerRoles.includes(role)
      ? await prisma.customerNotifyPrefs.findFirst({
          where: { userId },
        })
      : await prisma.transcriberNotifyPrefs.findFirst({
          where: { userId },
        })
    const recordsPerPage = await prisma.user.findUnique({
      where: { id: userId },
      select: { recordsPerPage: true },
    })

    if (!defaultPreferences) {
      return {
        message: 'SCB_GET_DEFAULT_PREFERENCES_NOT_FOUND',
        statusCode: 404,
      }
    }

    if (defaultPreferences) {
      return {
        message: 'SCB_GET_DEFAULT_PREFERENCES_SUCCESS',
        statusCode: 200,
        preferences: defaultPreferences,
        recordsPerPage: recordsPerPage?.recordsPerPage,
      }
    } else {
      return {
        message: 'SCB_GET_DEFAULT_PREFERENCES_NOT_FOUND',
        statusCode: 404,
      }
    }
  } catch (err) {
    logger.error(`Error getting default Preferences: ${err}`)
    return {
      message: 'SCB_GET_DEFAULT_PREFERENCES_FAILED',
      statusCode: 500,
    }
  }
}
