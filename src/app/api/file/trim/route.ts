import axios from 'axios'
import { NextResponse } from 'next/server'

import { FILE_CACHE_URL } from '@/constants'

export async function POST(req: Request) {
  try {
    const { fileId, startTime, endTime } = await req.json()

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

    return NextResponse.json(response.data)
  } catch (error) {
    console.error('Error trimming audio:', error)
    return NextResponse.json(
      { error: 'An error occurred while trimming the audio' },
      { status: 500 }
    )
  }
}
