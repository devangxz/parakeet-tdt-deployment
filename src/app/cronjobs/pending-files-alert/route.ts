import { OrderStatus, ReportOption } from '@prisma/client'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAWSSesInstance } from '@/lib/ses'

const NOTIFICATION_THRESHOLDS = [12, 16, 20, 24]

export async function POST() {
  try {
    logger.info('Starting pending files alert check')

    const pendingOrders = await prisma.order.findMany({
      where: {
        status: {
          in: [
            OrderStatus.TRANSCRIBED,
            OrderStatus.FORMATTED,
            OrderStatus.REVIEW_COMPLETED,
          ],
        },
      },
      include: {
        File: true,
        Assignment: {
          where: {
            status: {
              in: ['ACCEPTED', 'COMPLETED'],
            },
          },
        },
      },
    })

    logger.info(`Found ${pendingOrders.length} pending orders`)

    // Filter orders with no assignments
    const unassignedOrders = pendingOrders.filter(
      (order) => order.Assignment.length === 0
    )

    logger.info(`Found ${unassignedOrders.length} unassigned orders`)

    if (unassignedOrders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending unassigned files found',
      })
    }

    // Group files by elapsed time
    const currentTime = new Date()
    const filesByThreshold: Record<
      number,
      Array<{
        fileId: string
        filename: string
        duration: number
        orderTs: Date
        hoursElapsed: number
        orderId: number
      }>
    > = {}

    // Initialize thresholds
    NOTIFICATION_THRESHOLDS.forEach((threshold) => {
      filesByThreshold[threshold] = []
    })

    // Categorize files by elapsed time
    unassignedOrders.forEach((order) => {
      const orderTime = new Date(order.orderTs)
      const elapsedMs = currentTime.getTime() - orderTime.getTime()
      const elapsedHours = elapsedMs / (1000 * 60 * 60)

      // Find the appropriate threshold
      for (let i = 0; i < NOTIFICATION_THRESHOLDS.length; i++) {
        const currentThreshold = NOTIFICATION_THRESHOLDS[i]
        const nextThreshold = NOTIFICATION_THRESHOLDS[i + 1] || Infinity

        if (elapsedHours >= currentThreshold && elapsedHours < nextThreshold) {
          filesByThreshold[currentThreshold].push({
            fileId: order.fileId,
            filename: order.File?.filename || 'Unknown',
            duration: order.File?.duration || 0,
            orderTs: order.orderTs,
            hoursElapsed: elapsedHours,
            orderId: order.id,
          })
          break
        }
      }
    })

    // Generate email content
    let pendingFilesTable =
      '<table style="width:100%; border-collapse: collapse;">'
    pendingFilesTable += '<tr style="background-color: #f2f2f2;">'
    pendingFilesTable +=
      '<th style="padding: 8px; text-align: left; border: 1px solid #ddd;">File ID</th>'
    pendingFilesTable +=
      '<th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Filename</th>'
    pendingFilesTable +=
      '<th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Duration (min)</th>'
    pendingFilesTable +=
      '<th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Order Time</th>'
    pendingFilesTable +=
      '<th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Hours Elapsed</th>'
    pendingFilesTable +=
      '<th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Threshold</th>'
    pendingFilesTable += '</tr>'

    let hasFiles = false
    // Keep track of orders to update
    const ordersToUpdate: number[] = []

    // Add files to the table
    NOTIFICATION_THRESHOLDS.forEach((threshold) => {
      const files = filesByThreshold[threshold]
      if (files.length > 0) {
        hasFiles = true
        files.forEach((file) => {
          pendingFilesTable += '<tr>'
          pendingFilesTable += `<td style="padding: 8px; text-align: left; border: 1px solid #ddd;">${file.fileId}</td>`
          pendingFilesTable += `<td style="padding: 8px; text-align: left; border: 1px solid #ddd;">${file.filename}</td>`
          pendingFilesTable += `<td style="padding: 8px; text-align: left; border: 1px solid #ddd;">${(
            file.duration / 60
          ).toFixed(2)}</td>`
          pendingFilesTable += `<td style="padding: 8px; text-align: left; border: 1px solid #ddd;">${file.orderTs.toISOString()}</td>`
          pendingFilesTable += `<td style="padding: 8px; text-align: left; border: 1px solid #ddd;">${file.hoursElapsed.toFixed(
            2
          )}</td>`
          pendingFilesTable += `<td style="padding: 8px; text-align: left; border: 1px solid #ddd;">${threshold} hours</td>`
          pendingFilesTable += '</tr>'

          ordersToUpdate.push(file.orderId)
        })
      }
    })

    pendingFilesTable += '</table>'

    if (!hasFiles) {
      return NextResponse.json({
        success: true,
        message: 'No files matching notification thresholds',
      })
    }

    // Send email alert
    const emailData = {
      userEmailId: 'support@scribie.com',
    }

    const templateData = {
      pendingFilesTable,
    }

    const ses = getAWSSesInstance()
    await ses.sendMail('PENDING_FILES_ALERT', emailData, templateData)

    logger.info('Pending files alert email sent successfully')

    if (ordersToUpdate.length > 0) {
      await Promise.all(
        ordersToUpdate.map(async (orderId) => {
          await prisma.order.update({
            where: { id: orderId },
            data: {
              status: OrderStatus.SUBMITTED_FOR_SCREENING,
              screenCount: {
                increment: 1,
              },
              reportOption: ReportOption.NOT_PICKED_UP,
              updatedAt: new Date(),
            },
          })
        })
      )

      logger.info(
        `Updated ${ordersToUpdate.length} orders to SUBMITTED_FOR_SCREENING status`
      )
    }

    return NextResponse.json({
      success: true,
      message:
        'Pending files alert email sent successfully and orders moved to screening',
    })
  } catch (error) {
    logger.error(`Error sending pending files alert: ${error}`)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to send pending files alert',
        error: (error as Error).message,
      },
      { status: 500 }
    )
  }
}
