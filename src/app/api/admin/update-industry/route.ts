import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import { updateIndustry } from '@/services/admin/industry-service'

export async function POST(req: Request) {
  try {
    const { userEmail, industry } = await req.json()
    const response = await updateIndustry({ id: userEmail, industry })
    return NextResponse.json(response)
  } catch (error) {
    logger.error(`Error while updating industry`, error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again after some time.',
    })
  }
}
