import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import { updateLegalQC } from '@/services/admin/legal-qc-service'

export async function POST(req: Request) {
  try {
    const { userEmail, flag } = await req.json()
    const response = await updateLegalQC({ userEmail, flag })
    return NextResponse.json(response)
  } catch (error) {
    logger.error(`Error while updating legal QC`, error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again after some time.',
    })
  }
}
