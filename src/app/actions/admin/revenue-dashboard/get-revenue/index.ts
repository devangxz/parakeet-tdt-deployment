'use server'

import {
  endOfDay,
  startOfDay,
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isSameWeek,
  isSameMonth,
} from 'date-fns'
import { unstable_cache } from 'next/cache'

import prisma from '@/lib/prisma'

interface RevenueMetrics {
  date: string
  dayOfWeek: string
  revenue: number
  amount: number
  orderCount: number
  newCustomers: number
  totalCreditsAdded: number
  costs: {
    asr: number
    qc: number
    cf: number
    cfReview: number
    fileBonus: number
  }
  bonus: {
    daily: number
    other: number
  }
  totalCost: number
  margin: number
  marginPercentage: number
  hours: {
    qc: number
    review: number
    cf: number
  }
}

type TimeFrame = 'daily' | 'weekly' | 'monthly'

interface GetRevenueError extends Error {
  code: 'DATE_INVALID' | 'DATE_RANGE_TOO_LARGE' | 'INTERNAL_ERROR'
}

function aggregateMetrics(
  metrics: RevenueMetrics[],
  timeFrame: TimeFrame
): RevenueMetrics[] {
  if (timeFrame === 'daily') return metrics

  return metrics.reduce<RevenueMetrics[]>((acc, curr) => {
    const currDate = new Date(curr.date)
    const lastGroup = acc[acc.length - 1]

    const isInSamePeriod =
      lastGroup &&
      (timeFrame === 'weekly'
        ? isSameWeek(currDate, new Date(lastGroup.date))
        : isSameMonth(currDate, new Date(lastGroup.date)))

    if (isInSamePeriod && lastGroup) {
      lastGroup.revenue += curr.revenue
      lastGroup.amount += curr.amount
      lastGroup.orderCount += curr.orderCount
      lastGroup.newCustomers += curr.newCustomers
      lastGroup.totalCreditsAdded += curr.totalCreditsAdded
      lastGroup.costs.asr += curr.costs.asr
      lastGroup.costs.qc += curr.costs.qc
      lastGroup.costs.cf += curr.costs.cf
      lastGroup.costs.cfReview += curr.costs.cfReview
      lastGroup.costs.fileBonus += curr.costs.fileBonus
      lastGroup.bonus.daily += curr.bonus.daily
      lastGroup.bonus.other += curr.bonus.other
      lastGroup.totalCost += curr.totalCost
      lastGroup.margin = lastGroup.revenue - lastGroup.totalCost
      lastGroup.marginPercentage =
        lastGroup.revenue > 0 ? (lastGroup.margin / lastGroup.revenue) * 100 : 0
      lastGroup.hours.qc += curr.hours.qc
      lastGroup.hours.review += curr.hours.review
      lastGroup.hours.cf += curr.hours.cf
    } else {
      const periodStartDate =
        timeFrame === 'weekly' ? startOfWeek(currDate) : startOfMonth(currDate)

      acc.push({
        ...curr,
        date: format(periodStartDate, 'yyyy-MM-dd'),
        dayOfWeek: format(periodStartDate, 'EEEE'),
      })
    }

    return acc
  }, [])
}

const CACHE_TAG = 'revenue-metrics'
const REVALIDATE_TIME = 60 * 5

export async function getRevenue(
  startDate: Date,
  endDate: Date,
  timeFrame: TimeFrame
): Promise<RevenueMetrics[]> {
  try {
    // Validate inputs
    if (!(startDate instanceof Date) || !(endDate instanceof Date)) {
      throw Object.assign(new Error('Invalid date format'), {
        code: 'DATE_INVALID',
      } as GetRevenueError)
    }

    // Adjust date range based on timeFrame
    const start = startOfDay(
      timeFrame === 'weekly'
        ? startOfWeek(startDate)
        : timeFrame === 'monthly'
        ? startOfMonth(startDate)
        : startDate
    )

    const end = endOfDay(
      timeFrame === 'weekly'
        ? endOfWeek(endDate)
        : timeFrame === 'monthly'
        ? endOfMonth(endDate)
        : endDate
    )

    // Use cache for expensive calculations
    return await unstable_cache(
      async () => {
        // Get orders within date range
        const orders = await prisma.order.findMany({
          where: {
            orderTs: {
              gte: start,
              lte: end,
            },
            user: {
              Customer: {
                isTestCustomer: false,
              },
            },
          },
          include: {
            File: true,
          },
        })

        // Get assignments within date range
        const assignments = await prisma.jobAssignment.findMany({
          where: {
            status: 'COMPLETED',
            completedTs: {
              gte: start,
              lte: end,
            },
          },
          include: {
            order: {
              include: {
                File: true,
              },
            },
          },
        })

        // Get invoices within date range
        const invoices = await prisma.invoice.findMany({
          where: {
            ts: {
              gte: start,
              lte: end,
            },
            status: 'PAID',
            user: {
              Customer: {
                isTestCustomer: false,
              },
            },
          },
        })

        // Get new customers within date range
        const newCustomers = await prisma.user.findMany({
          where: {
            createdAt: {
              gte: start,
              lte: end,
            },
            role: 'CUSTOMER',
          },
        })

        // Get bonuses within date range
        const bonuses = await prisma.bonus.findMany({
          where: {
            createdAt: {
              gte: start,
              lte: end,
            },
          },
        })

        // Calculate metrics for each day/week/month
        const metrics: RevenueMetrics[] = []
        const currentDate = start

        while (currentDate <= end) {
          const dateStr = format(currentDate, 'yyyy-MM-dd')

          // Filter data for current date
          const dayOrders = orders.filter(
            (order) => format(order.orderTs, 'yyyy-MM-dd') === dateStr
          )

          const dayInvoices = invoices.filter(
            (invoice) => format(invoice.ts, 'yyyy-MM-dd') === dateStr
          )

          const dayBonuses = bonuses.filter(
            (bonus) => format(bonus.createdAt, 'yyyy-MM-dd') === dateStr
          )

          const dayNewCustomers = newCustomers.filter(
            (customer) => format(customer.createdAt, 'yyyy-MM-dd') === dateStr
          )

          const dayAssignments = assignments.filter(
            (assignment) =>
              format(assignment.completedTs!, 'yyyy-MM-dd') === dateStr
          )

          // Calculate ASR cost (0.37 per hour)
          const totalDuration = dayOrders.reduce(
            (acc, order) => acc + (order.File?.duration || 0),
            0
          )
          const asrCost = (totalDuration / 3600) * 0.37

          const bonusOrders = orders.filter(
            (order) =>
              format(order.orderTs, 'yyyy-MM-dd') === dateStr &&
              order.rateBonus !== 0
          )
          const totalBonusDuration = bonusOrders.reduce(
            (acc, order) => acc + (order.File?.duration || 0),
            0
          )
          const totalBonusHours = totalBonusDuration / 3600
          const combinedOrderBonus = bonusOrders.reduce(
            (acc, order) => acc + (order.rateBonus || 0),
            0
          )
          const fileBonus = totalBonusHours * combinedOrderBonus

          const qcAssignments = dayAssignments.filter(
            (assignment) => assignment.type === 'QC'
          )
          const reviewAssignments = dayAssignments.filter(
            (assignment) => assignment.type === 'REVIEW'
          )
          const cfAssignments = dayAssignments.filter(
            (assignment) => assignment.type === 'FINALIZE'
          )

          const qcCost = qcAssignments.reduce(
            (acc, assignment) => acc + (assignment.earnings || 0),
            0
          )
          const reviewCost = reviewAssignments.reduce(
            (acc, assignment) => acc + (assignment.earnings || 0),
            0
          )
          const cfCost = cfAssignments.reduce(
            (acc, assignment) => acc + (assignment.earnings || 0),
            0
          )

          // Calculate hours worked
          const qcHours = qcAssignments.reduce(
            (acc, assignment) =>
              acc + (assignment.order.File?.duration || 0) / 3600,
            0
          )
          const reviewHours = reviewAssignments.reduce(
            (acc, assignment) =>
              acc + (assignment.order.File?.duration || 0) / 3600,
            0
          )
          const cfHours = cfAssignments.reduce(
            (acc, assignment) =>
              acc + (assignment.order.File?.duration || 0) / 3600,
            0
          )

          // Calculate bonuses
          const dailyBonus = dayBonuses
            .filter((bonus) => bonus.type === 'DAILY')
            .reduce((acc, bonus) => acc + bonus.amount, 0)

          const otherBonus = dayBonuses
            .filter((bonus) => bonus.type !== 'DAILY')
            .reduce((acc, bonus) => acc + bonus.amount, 0)

          // Calculate revenue and credits
          const revenue = dayInvoices.reduce(
            (acc, invoice) =>
              acc +
              (invoice.type === 'FORMATTING' ||
              invoice.type === 'TRANSCRIPT' ||
              invoice.type === 'ADD_CREDITS' ||
              invoice.type === 'FREE_CREDITS' ||
              invoice.type === 'ADDL_FORMATTING' ||
              invoice.type === 'ADDL_PROOFREADING' ||
              invoice.type === 'DEPRECATED'
                ? invoice.amount
                : 0) -
              (invoice.creditsUsed || 0) -
              (invoice.refundAmount || 0) -
              (invoice.discount || 0),
            0
          )
          const creditsAdded = dayInvoices
            .filter(
              (invoice) =>
                invoice.type === 'ADD_CREDITS' ||
                invoice.type === 'FREE_CREDITS'
            )
            .reduce((acc, invoice) => acc + invoice.amount, 0)

          const totalCost =
            asrCost +
            qcCost +
            reviewCost +
            cfCost +
            dailyBonus +
            otherBonus +
            fileBonus

          const margin = revenue - totalCost
          const marginPercentage = revenue > 0 ? (margin / revenue) * 100 : 0

          metrics.push({
            date: dateStr,
            dayOfWeek: format(currentDate, 'EEEE'),
            revenue,
            amount: revenue,
            orderCount: dayOrders.length,
            newCustomers: dayNewCustomers.length,
            totalCreditsAdded: creditsAdded,
            costs: {
              asr: asrCost,
              qc: qcCost,
              cfReview: reviewCost,
              fileBonus: fileBonus,
              cf: cfCost,
            },
            bonus: {
              daily: dailyBonus,
              other: otherBonus,
            },
            totalCost,
            margin,
            marginPercentage,
            hours: {
              qc: qcHours,
              review: reviewHours,
              cf: cfHours,
            },
          })

          currentDate.setDate(currentDate.getDate() + 1)
        }

        return aggregateMetrics(metrics, timeFrame)
      },
      [
        `${CACHE_TAG}-${timeFrame}-${format(start, 'yyyy-MM-dd')}-${format(
          end,
          'yyyy-MM-dd'
        )}`,
      ],
      {
        revalidate: REVALIDATE_TIME,
        tags: [CACHE_TAG],
      }
    )()
  } catch (error) {
    console.error('Error in getRevenue:', error)
    throw Object.assign(
      new Error(
        error instanceof Error ? error.message : 'Failed to fetch revenue data'
      ),
      { code: 'INTERNAL_ERROR' } as GetRevenueError
    )
  }
}
