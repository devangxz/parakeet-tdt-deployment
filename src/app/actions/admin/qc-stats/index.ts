'use server'

import { format, startOfDay, endOfDay, differenceInDays } from 'date-fns'

import prisma from '@/lib/prisma'

interface QCStats {
  t: [number, number][]
  d: [number, string][]
  a: { t: number }
}

export async function fetchQCStats(from: string, to: string): Promise<QCStats> {
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

  // Generate date labels
  let i = 0
  const dateCursor = new Date(startTs)
  while (dateCursor.getTime() <= endTs) {
    stats.d.push([i++, format(dateCursor, 'MM/dd')])
    dateCursor.setDate(dateCursor.getDate() + 1)
  }

  // Fetch delivered orders with durations grouped by date
  const deliveredOrders = await prisma.order.findMany({
    where: {
      status: 'DELIVERED',
      deliveredTs: {
        gte: startOfDay(startDate),
        lte: endOfDay(endDate),
      },
    },
    include: {
      File: {
        select: {
          duration: true,
        },
      },
    },
  })

  // Group the data by date and calculate totals
  const deliveryDataMap = new Map<number, number>()

  deliveredOrders.forEach((order) => {
    if (!order.File) return

    const orderDate = new Date(order.deliveredTs)
    const dayIndex = period - differenceInDays(endDate, orderDate)

    // Convert duration from seconds to hours and round to 2 decimal places
    const durationInHours = Math.round((order.File.duration / 3600) * 100) / 100

    const currentValue = deliveryDataMap.get(dayIndex) || 0
    deliveryDataMap.set(dayIndex, currentValue + durationInHours)
  })

  // Fill stats with grouped results
  for (let i = 0; i <= period; i++) {
    const hoursValue = deliveryDataMap.get(i) || 0
    stats.t.push([i, hoursValue])
    stats.a.t += hoursValue
  }

  return stats
}
