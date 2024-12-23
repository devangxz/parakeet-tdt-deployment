import { Role, OrderType } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import isValidEmail from '@/utils/isValidEmail'

interface GetCustomPlanDetailsParams {
  userEmail: string
}

interface UpdateCustomPlanParams {
  userEmail: string
  rates: {
    manualTranscriptRate: string
    strictVerbatiumRate: string
    agreedMonthlyHours: string
    additionalChargeRate: string
    audioTimeCodingRate: string
    rushOrderRate: string
    customFormattingRate: string
    customFormattingTranscriberRate: string
    customFormattingReviewRate: string
    customFormattingMediumDifficultyReviewRate: string
    customFormattingHighDifficultyReviewRate: string
    customFormattingOption: string
    customFormatDeadline: string
    orderType: OrderType
  }
}

export async function getCustomPlanDetails({
  userEmail,
}: GetCustomPlanDetailsParams) {
  try {
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

    if (user.role !== Role.CUSTOMER && user.role !== Role.ADMIN) {
      logger.error(`User is not a customer: ${userEmail}`)
      return { success: false, s: 'User is not a customer' }
    }

    const customPlanDetails = await prisma.userRate.findUnique({
      where: {
        userId: user.id,
      },
    })

    const organizationName = await prisma.organization.findUnique({
      where: {
        userId: user.id,
      },
    })

    const templates = await prisma.template.findMany({
      where: {
        userId: user.id,
      },
    })

    if (!customPlanDetails) {
      logger.info(`Custom plan details not found for user ${user.email}`)
      return {
        success: true,
        rates: false,
        organizationName: organizationName?.name,
        templateName: templates?.map((template) => template.name).join(','),
      }
    }

    logger.info(`Custom plan details found for user ${user.email}`)
    return {
      success: true,
      rates: customPlanDetails,
      organizationName: organizationName?.name,
      templateName: templates?.map((template) => template.name).join(','),
    }
  } catch (error) {
    logger.error('Error fetching custom plan details:', error)
    return { success: false, s: 'Failed to fetch custom plan details' }
  }
}

export async function updateCustomPlan({
  userEmail,
  rates,
}: UpdateCustomPlanParams) {
  try {
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

    if (user.role !== Role.CUSTOMER && user.role !== Role.ADMIN) {
      logger.error(`User is not a customer: ${userEmail}`)
      return { success: false, s: 'User is not a customer' }
    }

    await prisma.$transaction(async (prisma) => {
      await prisma.userRate.upsert({
        where: { userId: user.id },
        update: {
          manualRate: parseFloat(rates.manualTranscriptRate),
          svRate: parseFloat(rates.strictVerbatiumRate),
          agreedMonthlyHours: parseFloat(rates.agreedMonthlyHours),
          addChargeRate: parseFloat(rates.additionalChargeRate),
          audioTimeCoding: parseFloat(rates.audioTimeCodingRate),
          rushOrder: parseFloat(rates.rushOrderRate),
          customFormat: parseFloat(rates.customFormattingRate),
          customFormatQcRate: parseFloat(rates.customFormattingTranscriberRate),
          customFormatReviewRate: parseFloat(rates.customFormattingReviewRate),
          customFormatMediumDifficultyReviewRate: parseFloat(
            rates.customFormattingMediumDifficultyReviewRate
          ),
          customFormatHighDifficultyReviewRate: parseFloat(
            rates.customFormattingHighDifficultyReviewRate
          ),
          customFormatOption: rates.customFormattingOption,
          deadline: parseInt(rates.customFormatDeadline),
          orderType: rates.orderType,
          updatedAt: new Date(),
        },
        create: {
          userId: user.id,
          manualRate: parseFloat(rates.manualTranscriptRate),
          svRate: parseFloat(rates.strictVerbatiumRate),
          agreedMonthlyHours: parseFloat(rates.agreedMonthlyHours),
          addChargeRate: parseFloat(rates.additionalChargeRate),
          audioTimeCoding: parseFloat(rates.audioTimeCodingRate),
          rushOrder: parseFloat(rates.rushOrderRate),
          customFormat: parseFloat(rates.customFormattingRate),
          customFormatQcRate: parseFloat(rates.customFormattingTranscriberRate),
          customFormatReviewRate: parseFloat(rates.customFormattingReviewRate),
          customFormatMediumDifficultyReviewRate: parseFloat(
            rates.customFormattingMediumDifficultyReviewRate
          ),
          customFormatHighDifficultyReviewRate: parseFloat(
            rates.customFormattingHighDifficultyReviewRate
          ),
          customFormatOption: rates.customFormattingOption,
          deadline: parseInt(rates.customFormatDeadline),
          orderType: rates.orderType,
        },
      })

      await prisma.customer.update({
        where: { userId: user.id },
        data: {
          customPlan: true,
        },
      })
    })

    logger.info(`Successfully added custom plan details for user ${user.email}`)
    return {
      success: true,
      s: 'Successfully added custom plan details',
    }
  } catch (error) {
    logger.error('Error updating custom plan:', error)
    return { success: false, s: 'Failed to update custom plan' }
  }
}
