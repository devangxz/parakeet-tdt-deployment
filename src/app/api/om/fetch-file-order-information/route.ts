/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import calculateFileCost from '@/utils/calculateFileCost'

export async function GET(req: NextRequest) {
  try {
    const fileId = req.nextUrl.searchParams.get('fileId')

    if (!fileId) {
      return NextResponse.json({
        success: false,
        s: 'File id parameter is required.',
      })
    }

    const orderInformation: any = await prisma.order.findUnique({
      where: {
        fileId: fileId,
      },
      include: {
        File: true,
        Assignment: {
          include: {
            user: true,
          },
        },
      },
    })

    if (orderInformation) {
      const fileCost = await calculateFileCost(orderInformation)
      orderInformation.fileCost = fileCost
    }

    return NextResponse.json({
      success: true,
      details: orderInformation,
    })
  } catch (error) {
    logger.error(`Error while fetching order information`, error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again after some time.',
    })
  }
}
