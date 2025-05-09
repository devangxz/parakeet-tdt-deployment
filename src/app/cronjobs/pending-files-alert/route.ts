import { OrderStatus } from '@prisma/client'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAWSSesInstance } from '@/lib/ses'

export async function POST() {
  try {
    logger.info('Starting pending files alert check')

    const pendingOrders = await prisma.order.findMany({
      where: {
        status: {
          in: [OrderStatus.TRANSCRIBED],
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

    // Calculate elapsed time for each file
    const currentTime = new Date()
    const pendingFiles = unassignedOrders.map((order) => {
      const orderTime = new Date(order.orderTs)
      const elapsedMs = currentTime.getTime() - orderTime.getTime()
      const elapsedHours = elapsedMs / (1000 * 60 * 60)

      return {
        fileId: order.fileId,
        filename: order.File?.filename || 'Unknown',
        duration: order.File?.duration || 0,
        orderTs: order.orderTs,
        hoursElapsed: elapsedHours,
        orderId: order.id,
      }
    })

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
    pendingFilesTable += '</tr>'

    pendingFiles.forEach((file) => {
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
      pendingFilesTable += '</tr>'
    })

    pendingFilesTable += '</table>'

    if (pendingFiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending files to report',
      })
    }

    const emailData = {
      userEmailId: 'support@scribie.com',
    }

    const templateData = {
      pendingFilesTable,
    }

    const ses = getAWSSesInstance()
    await ses.sendMail('PENDING_FILES_ALERT', emailData, templateData)

    logger.info('Pending files alert email sent successfully')

    return NextResponse.json({
      success: true,
      message: 'Pending files alert email sent successfully',
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
