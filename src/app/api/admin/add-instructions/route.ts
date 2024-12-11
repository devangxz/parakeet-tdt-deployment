import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import { updateInstructions } from '@/services/admin/instructions-service'

export async function POST(req: Request) {
  try {
    const { id, instructions } = await req.json()
    const response = await updateInstructions({ id, instructions })
    return NextResponse.json(response)
  } catch (error) {
    logger.error(`Error while updating instructions`, error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again after some time.',
    })
  }
}
