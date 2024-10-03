import crypto from 'crypto'

import {
  TeamMemberRole,
  InvoiceType,
  InvoiceStatus,
  Role,
} from '@prisma/client'

import { DEFAULT_ORDER_OPTIONS, RATES } from '@/constants'
import gateway from '@/lib/braintree'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export const getOrderOptions = async (userId: number) => {
  let options = DEFAULT_ORDER_OPTIONS
  try {
    const result = await prisma.defaultOption.findUnique({
      where: { userId: userId },
    })

    if (result && result.options) {
      options = { ...options, ...JSON.parse(result.options) }
    }
    logger.info(`Order options for user ${userId}:`, options)
    return options
  } catch (error) {
    logger.error('Failed to get order options:', error)
    return null
  }
}

export const generateInvoiceId = (prefix: string) => {
  const uniqueId = crypto.randomBytes(8).toString('hex')
  return `${prefix}${uniqueId.toUpperCase()}`
}

export const getTeamAdminUserDetails = async (internalAdminUserId: number) => {
  try {
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        userId: internalAdminUserId,
        role: TeamMemberRole.INTERNAL_TEAM_USER,
      },
    })

    if (!teamMember) {
      logger.error(
        `No team found with the given internal admin user ID ${internalAdminUserId}`
      )
      return false
    }

    const adminTeamMember = await prisma.teamMember.findFirst({
      where: {
        teamId: teamMember.teamId,
        role: TeamMemberRole.SUPER_ADMIN,
      },
      include: {
        user: true,
      },
    })

    if (!adminTeamMember) {
      logger.error(`No admin found for the team ${teamMember.teamId}`)
      return false
    }

    return {
      email: adminTeamMember.user.email,
      userId: adminTeamMember.userId,
    }
  } catch (err) {
    logger.error('Failed to get team admin user details:', err)
    return false
  }
}

export const getTeamSuperAdminUserId = async (
  internalTeamUserId: number | null,
  userId: number
) => {
  const teamAdminDetails = internalTeamUserId
    ? await getTeamAdminUserDetails(userId)
    : null
  if (teamAdminDetails) {
    return teamAdminDetails.userId
  } else {
    return userId
  }
}

export const getUserRate = async (userId: number) => {
  try {
    const userRate = await prisma.userRate.findUnique({
      where: {
        userId,
      },
    })

    if (!userRate) {
      logger.info(`No rates found for user ID ${userId}`)
      return false
    }

    logger.info(`User rates for user ID ${userId}:`, userRate)

    return {
      manual: userRate.manualRate,
      sv: userRate.svRate,
      ac: userRate.addChargeRate,
      atc: userRate.audioTimeCoding,
      ro: userRate.rushOrder || 0,
      cf: userRate.customFormat,
    }
  } catch (error) {
    logger.error('Failed to fetch user rates:', error)
    return false
  }
}

export const getRate = async (userId: number, customPlan: boolean) => {
  const rateIndex = 1
  if (customPlan) {
    const rate = await getUserRate(userId)
    if (!rate) {
      return false
    }
    return rate.manual
  } else {
    return RATES[rateIndex].price
  }
}

export const getDiscountRate = async (userId: number) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: {
        userId,
      },
    })

    if (!customer) {
      logger.error(`No customer entry found for ${userId}`)
      return 0
    }

    logger.info(`Discount rate for user ID ${userId}:`, customer.discountRate)
    return customer.discountRate
  } catch (error) {
    logger.error('Failed to fetch discount rate:', error)
    return 0
  }
}

export const checkBraintreeCustomer = async (userId: number) => {
  try {
    const braintreeCustomer = await gateway.customer.find(userId.toString())
    if (braintreeCustomer) {
      return true
    }
    return false
  } catch (err) {
    return false
  }
}

export const getCreditsPreferences = async (userId: number) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: {
        userId,
      },
    })

    if (!customer) {
      return false
    }

    return customer.useCreditsDefault
  } catch (err) {
    return false
  }
}

export const getCreditsBalance = async (userId: number) => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: {
        userId,
        type: {
          in: [
            InvoiceType.TRANSCRIPT,
            InvoiceType.ADDL_FORMATTING,
            InvoiceType.ADDL_PROOFREADING,
            InvoiceType.ADD_CREDITS,
            InvoiceType.FREE_CREDITS,
          ],
        },
        status: {
          in: [InvoiceStatus.PAID, InvoiceStatus.BILLED],
        },
      },
    })

    const creditsBalance = invoices.reduce((acc, invoice) => {
      if (['ADD_CREDITS', 'FREE_CREDITS'].includes(invoice.type)) {
        return acc + (invoice.amount - invoice.refundAmount)
      } else {
        return acc + (invoice.creditsRefunded - invoice.creditsUsed)
      }
    }, 0)

    const roundedCreditsBalance = Math.round(creditsBalance * 100) / 100
    return roundedCreditsBalance || 0
  } catch (err) {
    return 0
  }
}

export const applyCredits = async (invoiceId: string, userId: number) => {
  try {
    const creditsBalance = await getCreditsBalance(userId)

    if (creditsBalance <= 0) {
      await prisma.invoice.update({
        where: {
          invoiceId,
        },
        data: {
          creditsUsed: 0,
        },
      })
      return false
    }
    const invoice = await prisma.invoice.findUnique({
      where: {
        invoiceId,
      },
    })

    if (!invoice) {
      return false
    }

    const total = (invoice.amount - invoice.discount).toFixed(2)
    const creditsUsed =
      creditsBalance >= parseFloat(total) ? parseFloat(total) : creditsBalance

    await prisma.invoice.update({
      where: {
        invoiceId,
      },
      data: {
        creditsUsed: Number(creditsUsed.toFixed(2)),
      },
    })

    return creditsUsed
  } catch (err) {
    return false
  }
}

export const generateUniqueTransactionId = () => {
  const NUMBER = 0x75bcd15
  const now = Date.now()
  const time = Math.floor(now / 1000).toString(16)
  const random = Math.floor(Math.random() * NUMBER)
    .toString(16)
    .padStart(5, '0')

  return time + random
}

export const getEmailDetails = async (userId: number, paidBy: number = 0) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    })

    if (!user) {
      logger.error(`No user found with the given user ID ${userId}`)
      return false
    }

    if (user.role !== Role.INTERNAL_TEAM_USER) {
      return {
        email: user.email,
        cc: [],
      }
    } else {
      const preferences = await prisma.customerNotifyPrefs.findUnique({
        where: {
          userId,
        },
      })

      if (preferences) {
        const teamMemberWhoOrdered = preferences.teamMemberWhoOrdered
        if (teamMemberWhoOrdered) {
          const orderUserDetails = await prisma.user.findUnique({
            where: {
              id: paidBy,
            },
          })
          return {
            email: orderUserDetails?.email,
            cc: [],
          }
        }
      }
      const teamMember = await prisma.teamMember.findFirst({
        where: {
          userId,
          role: 'INTERNAL_TEAM_USER',
        },
      })

      if (!teamMember) {
        logger.error(
          `No team found with the given internal admin user ID ${userId}`
        )
        return false
      }
      const getTeamMembers = await prisma.teamMember.findMany({
        where: {
          teamId: teamMember.teamId,
          role: {
            not: 'INTERNAL_TEAM_USER',
          },
        },
        include: {
          user: true,
        },
      })

      return {
        email: getTeamMembers.filter(
          (member) => member.role === 'SUPER_ADMIN'
        )[0].user.email,
        cc: getTeamMembers
          .filter((member) => member.role !== 'SUPER_ADMIN')
          .map((member) => member.user.email),
      }
    }
  } catch (err) {
    return false
  }
}
