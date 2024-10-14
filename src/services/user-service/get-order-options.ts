import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

const getDefaultOptions = async (userId: number) => {
  logger.info('--> getDefaultOptions')
  try {
    const defaultOptions = await prisma.defaultOption.findUnique({
      where: { userId },
    })

    const instructions = await prisma.defaultInstruction.findFirst({
      where: { userId },
      select: { instructions: true },
    })

    if (!defaultOptions || !defaultOptions.options) {
      return {
        message: 'SCB_GET_DEFAULT_OPTIONS_NOT_FOUND',
        statusCode: 404,
      }
    }

    return {
      message: 'SCB_GET_DEFAULT_OPTIONS_SUCCESS',
      statusCode: 200,
      options: JSON.parse(defaultOptions.options),
      instructions,
    }
  } catch (err) {
    logger.error(`Error getting default options: ${err}`)
    return {
      message: 'SCB_GET_DEFAULT_OPTIONS_FAILED',
      statusCode: 500,
    }
  }
}

export default getDefaultOptions
