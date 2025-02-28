'use server'

import { endOfDay, format, startOfDay } from 'date-fns'
import { unstable_cache } from 'next/cache'

import prisma from '@/lib/prisma'
import { getTeamAdminUserDetails } from '@/utils/backend-helper'

interface OrderMetrics {
  orderId: string
  fileId: string
  fileName: string
  orderDate: string
  deliveryDate: string | null
  amount: number
  status: string
  duration: number
  pwer: number
  customerEmail: string
  workers: {
    qc: string[]
    review: string[]
    cf: string[]
  }
  costs: {
    asr: number
    qc: number
    cf: number
    cfReview: number
  }
  totalCost: number
  margin: number
  marginPercentage: number
}

interface GetOrdersError extends Error {
  code: 'DATE_INVALID' | 'INTERNAL_ERROR'
}

const CACHE_TAG = 'order-metrics'
const REVALIDATE_TIME = 60 * 5
const NO_ORG_NAME = 'No Organization'

export async function getOrgRevenue(
  startDate: Date,
  endDate: Date,
  orgName: string
): Promise<OrderMetrics[]> {
  try {
    if (!(startDate instanceof Date) || !(endDate instanceof Date)) {
      throw Object.assign(new Error('Invalid date format'), {
        code: 'DATE_INVALID',
      } as GetOrdersError)
    }

    const start = startOfDay(startDate)
    const end = endOfDay(endDate)

    return await unstable_cache(
      async () => {
        let userIds: number[] = []
        if (orgName !== NO_ORG_NAME) {
          const organizations = await prisma.organization.findMany({
            where: {
              name: {
                equals: orgName,
                mode: 'insensitive',
              },
            },
            select: { id: true, userId: true },
          })

          if (organizations.length > 0) {
            const orgUserIds = organizations.map((org) => org.userId)

            const teams = await prisma.team.findMany({
              where: { owner: { in: orgUserIds } },
            })

            const teamIds = teams.map((team) => team.id)
            const teamUsers = await prisma.teamMember.findMany({
              where: {
                role: 'INTERNAL_TEAM_USER',
                teamId: { in: teamIds },
              },
              select: { userId: true },
            })

            const teamUserIds = teamUsers.map((user) => user.userId)

            userIds = Array.from(new Set([...orgUserIds, ...teamUserIds]))
          }
        }

        const orders = await prisma.order.findMany({
          where: {
            orderTs: {
              gte: start,
              lte: end,
            },
            ...(userIds.length > 0 && { userId: { in: userIds } }),
          },
          include: {
            user: true,
            File: {
              include: {
                InvoiceFile: true,
              },
            },
            Assignment: {
              where: {
                OR: [{ type: 'QC' }, { type: 'REVIEW' }, { type: 'FINALIZE' }],
              },
              include: {
                user: true,
              },
            },
          },
        })

        const metrics: OrderMetrics[] = await Promise.all(
          orders.map(async (order) => {
            const duration = order.File?.duration || 0
            const asrCost = (duration / 3600) * 0.37

            // Get customer email
            let customerEmail = order.user.email
            if (order.user.role === 'INTERNAL_TEAM_USER') {
              const adminDetails = await getTeamAdminUserDetails(order.user.id)
              customerEmail = adminDetails
                ? adminDetails.email
                : order.user.email
            }

            const workers = {
              qc: order.Assignment.filter(
                (ja) =>
                  (ja.status === 'ACCEPTED' || ja.status === 'COMPLETED') &&
                  ja.type === 'QC'
              ).map((ja) => `${ja.user.firstname} ${ja.user.lastname}`),
              review: order.Assignment.filter(
                (ja) =>
                  (ja.status === 'ACCEPTED' || ja.status === 'COMPLETED') &&
                  ja.type === 'REVIEW'
              ).map((ja) => `${ja.user.firstname} ${ja.user.lastname}`),
              cf: order.Assignment.filter(
                (ja) =>
                  (ja.status === 'ACCEPTED' || ja.status === 'COMPLETED') &&
                  ja.type === 'FINALIZE'
              ).map((ja) => `${ja.user.firstname} ${ja.user.lastname}`),
            }

            // Calculate costs by type
            const qcCost = order.Assignment.filter(
              (ja) => ja.type === 'QC'
            ).reduce((acc, ja) => acc + (ja.earnings || 0), 0)

            const reviewCost = order.Assignment.filter(
              (ja) => ja.type === 'REVIEW'
            ).reduce((acc, ja) => acc + (ja.earnings || 0), 0)

            const cfCost = order.Assignment.filter(
              (ja) => ja.type === 'FINALIZE'
            ).reduce((acc, ja) => acc + (ja.earnings || 0), 0)

            const amount = order.File?.InvoiceFile?.[0]?.price || 0
            const totalCost = asrCost + qcCost + reviewCost + cfCost
            const margin = amount - totalCost
            const marginPercentage = amount > 0 ? (margin / amount) * 100 : 0

            return {
              orderId: order.id.toString(),
              fileId: order.fileId,
              fileName: order.File?.filename || '',
              orderDate: format(order.orderTs, 'yyyy-MM-dd'),
              deliveryDate: order.deliveryTs
                ? format(order.deliveryTs, 'yyyy-MM-dd')
                : null,
              amount,
              status: order.status,
              duration,
              pwer: order?.pwer || 0,
              customerEmail,
              workers,
              costs: {
                asr: asrCost,
                qc: qcCost,
                cfReview: reviewCost,
                cf: cfCost,
              },
              totalCost,
              margin,
              marginPercentage,
            }
          })
        )

        return metrics
      },
      [
        `${CACHE_TAG}-${format(start, 'yyyy-MM-dd')}-${format(
          end,
          'yyyy-MM-dd'
        )}-${orgName}`,
      ],
      {
        revalidate: REVALIDATE_TIME,
        tags: [CACHE_TAG],
      }
    )()
  } catch (error) {
    throw Object.assign(
      new Error(
        error instanceof Error ? error.message : 'Failed to fetch order data'
      ),
      { code: 'INTERNAL_ERROR' } as GetOrdersError
    )
  }
}
