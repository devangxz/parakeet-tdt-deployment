/* eslint-disable @typescript-eslint/no-explicit-any */
import { Role } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

interface GetUserInfoParams {
  id: string | number
}

export async function getUserInfo({ id }: GetUserInfoParams) {
  let filter = {}

  if (!isNaN(id as number)) {
    filter = { id: parseInt(id as string) }
  } else {
    filter = { email: id }
  }

  try {
    const user = await prisma.user.findUnique({
      where: filter as any,
      include: { Customer: true, Order: true, File: true },
    })

    if (!user) {
      logger.error(`User not found with id or email '${id}'`)
      return {
        success: false,
        s: `User with id or email '${id}' does not exist`,
      }
    }

    const roleMap = {
      CUSTOMER: 'Customer',
      ADMIN: 'Customer',
      TRANSCRIBER: 'Transcriber',
      TRANSCRIBER_LEVEL_2_LEGACY: 'Transcriber',
      PROOFREADER_LEGACY: 'Proofreader',
      REVIEWER: 'Reviewer',
      VERIFIER_LEGACY: 'Proofreader',
      QC: 'QC',
      CSADMIN: 'Customer Service Admin',
      SUPERADMIN: 'Super Admin',
      OM: 'Operations Manager',
      INTERNAL_TEAM_USER: 'Internal Team User',
      DEV_TEAM: 'Development Team',
      DEV_ADMINS: 'Development Admins',
    }
    const statusMap = {
      CREATED: 'Invited',
      VERIFIED: 'Sign up complete',
      SUSPENDED: 'Suspended',
    }

    const info: { [key: string]: any } = {}
    const uid = user.id
    info['User id'] = uid
    info['Email'] = user.email
    info['Name'] = `${user.firstname} ${user.lastname}`
    info['Type'] = roleMap[user.role]
    info['Spl instructions'] = user.splInstructions
    info['Industry'] = user.industry

    if (roleMap[user.role] === 'Customer') {
      const custAccType = user?.Customer?.customPlan
      info['Account Type'] = custAccType ? 'Custom Plan' : 'Pay as you go'
    }

    info['Status'] = statusMap[user.status]
    info['Signup date'] = new Date(user.createdAt).toUTCString()
    info['Last Access'] = new Date(user.lastAccess).toUTCString()

    if (roleMap[user.role] === 'Customer') {
      if (user.role === Role.INTERNAL_TEAM_USER) {
        const teamMembers = await prisma.teamMember.findMany({
          where: {
            team: { members: { some: { userId: uid } } },
            userId: { not: uid },
          },
          include: { user: true },
        })

        let count = 1
        teamMembers.forEach((member) => {
          info[
            `Team member ${count++}`
          ] = `${member.user.firstname} ${member.user.lastname} (${member.user.email})`
        })

        const team = await prisma.team.findFirst({
          where: { members: { some: { userId: uid } } },
        })

        if (team) {
          info['Team name'] = team.name
        }
      } else {
        const teamInfo = await prisma.teamMember.findMany({
          where: {
            userId: uid,
            status: 'ACCEPTED',
            role: { not: 'INTERNAL_TEAM_USER' },
            team: { members: { some: { role: 'INTERNAL_TEAM_USER' } } },
          },
          include: {
            team: {
              include: {
                members: {
                  where: { role: 'INTERNAL_TEAM_USER' },
                  include: { user: true },
                },
              },
            },
          },
        })

        let count = 1
        teamInfo.forEach((infoItem) => {
          info[
            `Team name ${count++} (role in team), (internal team id)`
          ] = `${infoItem.team.name} (${infoItem.role}), (${infoItem.team.members[0].user.id})`
        })
      }

      const lastInvoice = await prisma.invoice.findFirst({
        where: { userId: uid, status: { not: 'PENDING' } },
        orderBy: { updatedAt: 'desc' },
      })
      info['Last order date'] = lastInvoice
        ? new Date(lastInvoice.updatedAt).toUTCString()
        : 'N/A'

      info['Last access'] = new Date(user.lastAccess).toUTCString()

      const revenueResult = await prisma.invoice.aggregate({
        where: {
          userId: uid,
          status: { not: 'PENDING' },
          type: {
            in: [
              'TRANSCRIPT',
              'ADDL_FORMATTING',
              'ADDL_PROOFREADING',
              'ADD_CREDITS',
            ],
          },
        },
        _sum: { amount: true, refundAmount: true },
        _count: { id: true },
      })

      info['Total payments'] = `$${(
        (revenueResult?._sum?.amount ?? 0) -
        (revenueResult?._sum?.refundAmount ?? 0)
      ).toFixed(2)}`
      info['Number of orders'] = revenueResult._count.id

      const orderCount = await prisma.order.aggregate({
        where: {
          userId: uid,
        },
        _count: { id: true },
      })

      info['Ordered files'] = orderCount._count.id
      info['Billing'] = user?.Customer?.billing ?? 0
      info['Order Watching'] = user?.Customer?.watch ?? 0
      info['Delivery Watching'] = user?.Customer?.delWatch ?? 0

      const creditsAddedResult = await prisma.invoice.aggregate({
        where: {
          userId: uid,
          type: 'ADD_CREDITS',
          status: 'PAID',
        },
        _sum: { amount: true },
      })

      info['Credits added'] = creditsAddedResult._sum.amount
        ? `$${creditsAddedResult._sum.amount.toFixed(2)}`
        : '$0.00'

      const freeCreditsAddedResult = await prisma.invoice.aggregate({
        where: {
          userId: uid,
          type: 'FREE_CREDITS',
          status: 'PAID',
        },
        _sum: { amount: true },
      })
      info['Free Credits'] = freeCreditsAddedResult._sum.amount
        ? `$${freeCreditsAddedResult._sum.amount.toFixed(2)}`
        : '$0.00'

      info['Discount'] = user?.Customer?.discountRate ?? 0
      info['HD Discount'] = user?.Customer?.hdDiscount ?? 0

      const pendingFilesResult = await prisma.order.findMany({
        where: {
          userId: uid,
          status: {
            notIn: ['DELIVERED', 'CANCELLED', 'REFUNDED'],
          },
        },
        select: {
          fileId: true,
        },
      })

      const pendingFiles = pendingFilesResult.map((order) => order.fileId)
      info['Pending files'] =
        pendingFiles.length > 0 ? pendingFiles.join(', ') : 'None'

      const totalHoursResult = await prisma.file.aggregate({
        where: {
          Orders: {
            some: {
              userId: uid,
              status: {
                notIn: ['CANCELLED', 'REFUNDED'],
              },
            },
          },
        },
        _sum: {
          duration: true,
        },
      })

      const totalHours = totalHoursResult._sum.duration
        ? (totalHoursResult._sum.duration / 3600).toFixed(2)
        : '0.00'
      info['Number of hours ordered'] = totalHours
    } else {
      const transcriber = await prisma.verifier.findUnique({
        where: {
          userId: uid,
        },
      })

      info['QC Type'] = transcriber?.qcType
    }

    logger.info(`Fetched user info for ${user.email}, ${uid}`)
    return {
      success: true,
      details: info,
    }
  } catch (error) {
    logger.error('Error fetching user info:', error)
    return { success: false, s: 'Failed to fetch user info' }
  }
}
