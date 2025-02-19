'use server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function updateTranscriberWatchAction(
  userEmail: string,
  flag: boolean
) {
  try {
    const user = await prisma.user.findUnique({
      where: {
        email: userEmail.toLowerCase(),
      },
    })

    if (!user) {
      logger.error(`User not found with email ${userEmail}`)
      return { success: false, s: 'User not found' }
    }

    await prisma.verifier.upsert({
      where: { userId: user.id },
      update: { watchlist: flag },
      create: {
        userId: user.id,
        watchlist: flag,
      },
    })

    logger.info(
      `successfully ${
        flag ? 'added' : 'removed'
      } transcriber to watchlist for ${user.email}`
    )

    return {
      success: true,
      s: `Transcriber ${flag ? 'added' : 'removed'} to watchlist successfully`,
    }
  } catch (error) {
    logger.error(`Error while updating transcriber watchlist`, error)
    return {
      success: false,
      s: 'An error occurred. Please try again after some time.',
    }
  }
}
