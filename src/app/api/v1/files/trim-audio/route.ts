import axios from 'axios'
import { NextRequest, NextResponse } from 'next/server'

import { FILE_CACHE_URL } from '@/constants'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'

export async function POST(req: NextRequest) {
  const user = await authenticateRequest(req)

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const { fileId, startTime, endTime } = await req.json()

  if (!fileId) {
    return NextResponse.json(
      { message: 'File IDs is required' },
      { status: 400 }
    )
  }

  try {
    const file = await prisma.file.findUnique({
      where: {
        fileId: fileId,
      },
      select: {
        converted: true,
      },
    })

    if (!file) {
      return NextResponse.json({
        success: false,
        s: 'File not found',
      })
    }

    if (!file.converted) {
      return NextResponse.json({
        success: false,
        s: 'File is still being processed. Please try again later.',
      })
    }

    const response = await axios.post(
      `${FILE_CACHE_URL}/trim-audio`,
      {
        fileId,
        start: startTime,
        end: endTime,
      },
      {
        headers: {
          'x-api-key': process.env.CRON_API_KEY,
        },
      }
    )

    return NextResponse.json({
      success: true,
      data: response.data,
    })
  } catch (error) {
    logger.error('Error trimming audio:', error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred while trimming the audio',
    })
  }
}
