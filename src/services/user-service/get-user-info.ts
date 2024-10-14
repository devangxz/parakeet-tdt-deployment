import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export const getUserInfo = async (userId: number) => {
  logger.info('--> getUserInfo')
  try {
    const userInfo = await prisma.user.findUnique({
      where: { id: userId },
    })
    const secondaryEmail = await prisma.user.findUnique({
      where: { id: userId },
      select: { secondaryEmail: true },
    })
    if (!userInfo) {
      return {
        message: 'SCB_GET_USER_INFO_NOT_FOUND',
        statusCode: 404,
      }
    }
    return {
      message: 'SCB_GET_USER_INFO_SUCCESS',
      statusCode: 200,
      info: userInfo,
      secondaryEmail,
    }
  } catch (err) {
    logger.error(`Error: ${err}`)
    return {
      message: 'SCB_GET_USER_INFO_FAILED',
      statusCode: 500,
    }
  }
}
