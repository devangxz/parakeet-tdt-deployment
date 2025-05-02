'use server'

import { OrderStatus, OrderType, Prisma } from '@prisma/client'
import { format, startOfDay, endOfDay, differenceInDays } from 'date-fns'

import prisma from '@/lib/prisma'

interface QCStats {
  t: [number, number][]
  d: [number, string][]
  a: { t: number }
}

export async function fetchQCStats(
  from: string,
  to: string,
  orderTypes?: string[],
  orgNames?: string[]
): Promise<QCStats> {
  const startDate = new Date(from)
  const endDate = new Date(to)

  if (startDate > endDate) {
    throw new Error('From date cannot be later than to date')
  }

  const stats: QCStats = {
    t: [],
    d: [],
    a: { t: 0 },
  }

  const msPerDay = 1000 * 60 * 60 * 24
  const startTs = startDate.getTime()
  const endTs = endDate.getTime()
  const period = Math.floor((endTs - startTs) / msPerDay)

  let i = 0
  const dateCursor = new Date(startTs)
  while (dateCursor.getTime() <= endTs) {
    stats.d.push([i++, format(dateCursor, 'MM/dd')])
    dateCursor.setDate(dateCursor.getDate() + 1)
  }

  const whereClause: Prisma.OrderWhereInput = {
    status: 'DELIVERED' as OrderStatus,
    deliveredTs: {
      gte: startOfDay(startDate),
      lte: endOfDay(endDate),
    },
  }

  if (orderTypes && orderTypes.length > 0) {
    whereClause.orderType = {
      in: orderTypes as OrderType[],
    }
  }

  const deliveredOrders = await prisma.order.findMany({
    where: whereClause,
    include: {
      File: {
        select: {
          duration: true,
        },
      },
      user: {
        select: {
          Organization: true,
        },
      },
    },
  })

  let filteredOrders = deliveredOrders
  if (orgNames && orgNames.length > 0) {
    filteredOrders = deliveredOrders.filter((order) => {
      const orgName = order.user.Organization?.name || ''
      return (
        orgNames.includes(orgName) ||
        (orgNames.includes('NONE') && orgName === '')
      )
    })
  }

  const deliveryDataMap = new Map<number, number>()

  filteredOrders.forEach((order) => {
    if (!order.File) return

    const orderDate = new Date(order.deliveredTs)
    const dayIndex = period - differenceInDays(endDate, orderDate)

    const durationInHours = Math.round((order.File.duration / 3600) * 100) / 100

    const currentValue = deliveryDataMap.get(dayIndex) || 0
    deliveryDataMap.set(dayIndex, currentValue + durationInHours)
  })

  for (let i = 0; i <= period; i++) {
    const hoursValue = deliveryDataMap.get(i) || 0
    stats.t.push([i, hoursValue])
    stats.a.t += hoursValue
  }

  return stats
}
