import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

interface AddMiscEarningsParams {
  transcriberEmail: string
  amount: string | number
  reason: string
}

export async function addMiscEarnings({
  transcriberEmail,
  amount,
  reason,
}: AddMiscEarningsParams) {
  try {
    const transcriberInfo = await prisma.user.findUnique({
      where: { email: transcriberEmail.toLowerCase() },
    })

    if (!transcriberInfo) {
      logger.error(`Transcriber not found ${transcriberEmail}`)
      return { success: false, s: 'User not found' }
    }

    await prisma.miscEarnings.create({
      data: {
        userId: transcriberInfo.id,
        amount: Number(amount),
        reason,
      },
    })

    logger.info(`Successfully added misc earnings to ${transcriberEmail}`)
    return {
      success: true,
      s: 'Successfully added misc earnings',
    }
  } catch (error) {
    logger.error('Error adding misc earnings:', error)
    return { success: false, s: 'Failed to add misc earnings' }
  }
}
