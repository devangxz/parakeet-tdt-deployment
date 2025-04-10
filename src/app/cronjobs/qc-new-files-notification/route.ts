import { OrderStatus, Role, Status } from '@prisma/client'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAWSSesInstance } from '@/lib/ses'

export async function POST() {
  try {
    logger.info('Starting QC new files notification check')

    const transcribedOrders = await prisma.order.findMany({
      where: {
        status: OrderStatus.TRANSCRIBED,
      },
      include: {
        File: true,
      },
    })

    logger.info(`Found ${transcribedOrders.length} transcribed orders`)

    if (transcribedOrders.length < 3) {
      return NextResponse.json({
        success: true,
        message:
          'Less than 3 transcribed files available, no notification sent',
      })
    }

    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const eligibleQCs = await prisma.user.findMany({
      where: {
        role: {
          in: [Role.QC, Role.REVIEWER],
        },
        status: Status.VERIFIED,
        lastAccess: {
          gte: ninetyDaysAgo,
        },
        TranscriberNotifyPrefs: {
          newFilesAvailability: true,
        },
        Verifier: {
          qcDisabled: false,
        },
      },
      include: {
        TranscriberNotifyPrefs: true,
        Verifier: true,
      },
    })

    logger.info(`Found ${eligibleQCs.length} eligible QCs for notification`)

    if (eligibleQCs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No eligible QCs found for notification',
      })
    }

    const ses = getAWSSesInstance()
    const emailSentCount = await Promise.all(
      eligibleQCs.map(async (qc) => {
        try {
          const emailData = {
            userEmailId: qc.email,
          }

          await ses.sendMail('QC_NEW_FILES_NOTIFICATION', emailData, {})
          return true
        } catch (error) {
          logger.error(`Failed to send notification to QC ${qc.id}: ${error}`)
          return false
        }
      })
    )

    const successCount = emailSentCount.filter(Boolean).length

    return NextResponse.json({
      success: true,
      message: `Sent new files notifications to ${successCount} of ${eligibleQCs.length} QCs`,
    })
  } catch (error) {
    logger.error(`Error sending QC new files notification: ${error}`)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to send QC new files notification',
        error: (error as Error).message,
      },
      { status: 500 }
    )
  }
}
