import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import isValidEmail from '@/utils/isValidEmail'

interface ChangePaypalEmailParams {
  userEmail: string
  newEmail: string
}

export async function changePaypalEmail({
  userEmail,
  newEmail,
}: ChangePaypalEmailParams) {
  if (!isValidEmail(userEmail)) {
    logger.error(`Invalid email: ${userEmail}`)
    return { success: false, s: 'Invalid email' }
  }

  const user = await prisma.user.findUnique({
    where: {
      email: userEmail,
    },
  })

  if (!user) {
    logger.error(`User not found with email ${userEmail}`)
    return { success: false, s: 'User not found' }
  }

  try {
    await prisma.user.update({
      where: {
        email: userEmail,
      },
      data: {
        paypalId: newEmail,
      },
    })

    logger.info(
      `successfully changed paypal email of ${user.email} to ${newEmail}`
    )
    return {
      success: true,
      s: 'Successfully changed paypal email',
    }
  } catch (error) {
    logger.error('Error changing paypal email:', error)
    return { success: false, s: 'Failed to change paypal email' }
  }
}
