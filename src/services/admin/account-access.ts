/* eslint-disable @typescript-eslint/no-unused-vars */
import { signJwtAccessToken } from '@/lib/jwt'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import isValidEmail from '@/utils/isValidEmail'

export const accessAccount = async (userEmail: string) => {
  if (!isValidEmail(userEmail)) {
    logger.error(`Invalid email: ${userEmail}`)
    return { success: false, s: 'Invalid email' }
  }

  const user = await prisma.user.findUnique({
    where: { email: userEmail.toLowerCase() },
    include: {
      Verifier: true,
      UserRate: true,
      Customer: true,
      Organization: true,
    },
  })

  if (!user) {
    logger.error(`User not found with email ${userEmail}`)
    return { success: false, s: 'User not found' }
  }

  const { iat, exp, ...userWithoutIatExp } = user as {
    iat?: number
    exp?: number
  }

  const payload = {
    ...userWithoutIatExp,
    userId: user.id,
    user: user.user,
    email: user.email,
    role: user.role,
    referralCode: user.referralCode,
    adminAccess: true,
    readonly: true,
    legalEnabled: user?.Verifier?.legalEnabled || false,
    reviewEnabled: user?.Verifier?.cfReviewEnabled || false,
    generalFinalizerEnabled: user?.Verifier?.generalFinalizerEnabled || false,
    internalTeamUserId: null,
    teamName: null,
    selectedUserTeamRole: null,
    customPlan: user?.Customer?.customPlan || false,
    orderType: user.UserRate?.orderType || 'TRANSCRIPTION',
    organizationName: user.Organization?.name || 'NONE',
  }

  const token = signJwtAccessToken(payload)

  const details = {
    token,
    role: user.role,
    userId: user.id,
    user: user.user,
    email: user.email,
    referralCode: user.referralCode,
    adminAccess: true,
    readonly: true,
    legalEnabled: user?.Verifier?.legalEnabled || false,
    reviewEnabled: user?.Verifier?.cfReviewEnabled || false,
    generalFinalizerEnabled: user?.Verifier?.generalFinalizerEnabled || false,
    internalTeamUserId: null,
    teamName: null,
    selectedUserTeamRole: null,
    customPlan: user?.Customer?.customPlan || false,
    orderType: user.UserRate?.orderType || 'TRANSCRIPTION',
    organizationName: user.Organization?.name || 'NONE',
  }

  return { success: true, details }
}
