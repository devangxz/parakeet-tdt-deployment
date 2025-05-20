import { QCType, Role } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAWSSesInstance } from '@/lib/ses'
import isValidEmail from '@/utils/isValidEmail'

interface ICQCUser {
  id: number
  firstname: string | null
  lastname: string | null
  email: string
  monthlyBonusEnabled: boolean | null
  watchlist: boolean | null
  qcRate: number
  cfRate: number
  cfRRate: number
}

export interface MonthlyHours {
  month: string
  year: number
  totalHours: number
}

export async function getAllICQCs(): Promise<{
  success: boolean
  data?: ICQCUser[]
  message?: string
}> {
  try {
    const icQCs = await prisma.user.findMany({
      where: {
        Verifier: {
          qcType: QCType.CONTRACTOR,
        },
      },
      select: {
        id: true,
        firstname: true,
        lastname: true,
        email: true,
        Verifier: {
          select: {
            monthlyBonusEnabled: true,
            watchlist: true,
            qcRate: true,
            cfRate: true,
            cfRRate: true,
          },
        },
      },
    })

    const formattedICQCs: ICQCUser[] = icQCs.map((user) => ({
      id: user.id,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      monthlyBonusEnabled: user.Verifier?.monthlyBonusEnabled || false,
      watchlist: user.Verifier?.watchlist || false,
      qcRate: user.Verifier?.qcRate || 0,
      cfRate: user.Verifier?.cfRate || 0,
      cfRRate: user.Verifier?.cfRRate || 0,
    }))

    return {
      success: true,
      data: formattedICQCs,
    }
  } catch (error) {
    logger.error('Error fetching IC QCs:', error)
    return {
      success: false,
      message: 'Failed to fetch IC QCs',
    }
  }
}

export async function addICQC(
  email: string,
  qcRate: number,
  cfRate: number,
  cfRRate: number
): Promise<{ success: boolean; message: string }> {
  if (!isValidEmail(email)) {
    return { success: false, message: 'Invalid email' }
  }

  try {
    const user = await prisma.user.findUnique({
      where: {
        email: email.toLowerCase(),
      },
      include: {
        Verifier: true,
      },
    })

    if (!user) {
      logger.error(`User not found with email ${email}`)
      return { success: false, message: 'User not found' }
    }

    if (user.role !== Role.QC && user.role !== Role.REVIEWER) {
      logger.error(`User is not a QC or a Reviewer: ${email}`)
      return {
        success: false,
        message: 'User must be a QC or Reviewer to be added as an IC QC',
      }
    }

    await prisma.verifier.upsert({
      where: { userId: user.id },
      update: {
        qcType: QCType.CONTRACTOR,
        qcRate,
        cfRate,
        cfRRate,
        monthlyBonusEnabled: true,
      },
      create: {
        userId: user.id,
        qcType: QCType.CONTRACTOR,
        qcRate,
        cfRate,
        cfRRate,
        monthlyBonusEnabled: true,
      },
    })

    const awsSes = getAWSSesInstance()
    await awsSes.sendAlert(
      `New IC QC Added`,
      `${user.email} has been added as an IC QC.`,
      'software'
    )

    logger.info(`Successfully added IC QC for ${user.email}`)
    return {
      success: true,
      message: 'IC QC added successfully',
    }
  } catch (error) {
    logger.error(`Error adding IC QC for ${email}:`, error)
    return {
      success: false,
      message: 'Failed to add IC QC',
    }
  }
}

export async function removeICQC(
  userId: number
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        Verifier: true,
      },
    })

    if (!user) {
      logger.error(`User not found with id ${userId}`)
      return { success: false, message: 'User not found' }
    }

    if (!user.Verifier) {
      logger.error(`Verifier not found for user ${user.email}`)
      return { success: false, message: 'Verifier not found' }
    }

    await prisma.verifier.update({
      where: { userId: user.id },
      data: {
        qcType: QCType.FREELANCER,
      },
    })

    const awsSes = getAWSSesInstance()
    await awsSes.sendAlert(
      `IC QC Removed`,
      `${user.email} has been removed as an IC QC.`,
      'software'
    )

    logger.info(`Successfully removed IC QC for ${user.email}`)
    return {
      success: true,
      message: 'IC QC removed successfully',
    }
  } catch (error) {
    logger.error(`Error removing IC QC for user ID ${userId}:`, error)
    return {
      success: false,
      message: 'Failed to remove IC QC',
    }
  }
}

export async function getICQCMonthlyHours(
  userId: number
): Promise<{ success: boolean; data?: MonthlyHours[]; message?: string }> {
  try {
    // Get the current date
    const currentDate = new Date()
    const startDate = new Date(2025, 0, 1) // January 2025

    // Initialize result array with months from Jan 2025 to current month
    const monthlyHoursData: MonthlyHours[] = []
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth()

    // Generate all months from Jan 2025 to current month
    for (let year = 2025; year <= currentYear; year++) {
      const monthLimit = year === currentYear ? currentMonth : 11
      for (let month = year === 2025 ? 0 : 0; month <= monthLimit; month++) {
        monthlyHoursData.push({
          month: new Date(year, month, 1).toLocaleString('default', {
            month: 'long',
          }),
          year,
          totalHours: 0,
        })
      }
    }

    // Fetch the actual hours data from database using JobAssignment model
    // We're looking for completed jobs of type QC with the specified transcriberId
    const qcEntries = await prisma.jobAssignment.findMany({
      where: {
        transcriberId: userId,
        status: 'COMPLETED',
        type: 'QC',
        isICQC: true,
        completedTs: {
          gte: startDate,
          lte: currentDate,
        },
      },
      include: {
        order: true,
      },
    })

    // Process QC entries to calculate hours per month
    qcEntries.forEach((entry) => {
      if (!entry.completedTs) return

      const entryDate = new Date(entry.completedTs)
      const entryYear = entryDate.getFullYear()
      const entryMonth = entryDate.getMonth()

      // Find the corresponding month in our data
      const monthIndex = monthlyHoursData.findIndex(
        (item) =>
          item.year === entryYear &&
          item.month ===
            new Date(entryYear, entryMonth, 1).toLocaleString('default', {
              month: 'long',
            })
      )

      if (monthIndex !== -1) {
        // Estimate hours based on earnings or use a standard duration per job
        // For now, assuming a fixed duration of 1 hour per completed job
        monthlyHoursData[monthIndex].totalHours += 1
      }
    })

    return {
      success: true,
      data: monthlyHoursData,
    }
  } catch (error) {
    logger.error(`Error fetching monthly hours for IC QC ${userId}:`, error)
    return {
      success: false,
      message: 'Failed to fetch monthly hours',
    }
  }
}
