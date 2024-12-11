export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import { getMonitorDetails } from '@/services/admin/monitor-service'

export async function GET() {
  try {
    const response = await getMonitorDetails()
    return NextResponse.json(response)
  } catch (error) {
    logger.error(`Error while getting monitor details`, error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again after some time.',
    })
  }
}
