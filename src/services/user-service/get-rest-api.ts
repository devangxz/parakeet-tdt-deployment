import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

const getRestApi = async (userId: number) => {
  logger.info('--> getRestApi')
  try {
    const restApi = await prisma.apiKey.findUnique({
      where: { userId },
    })

    return {
      apiKey: restApi?.apiKey ?? null,
      webhook: restApi?.webhook ?? null,
      success: true,
    }
  } catch (err) {
    logger.error(`Error getting rest api: ${err}`)
    return {
      success: false,
      apiKey: null,
      webhook: null,
    }
  }
}

export default getRestApi
