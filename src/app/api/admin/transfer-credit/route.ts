import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import { transferCredit } from '@/services/admin/account-service'

export async function POST(req: Request) {
  try {
    const { invd, em } = await req.json()
    const response = await transferCredit({ invd, em })
    return NextResponse.json(response)
  } catch (error) {
    logger.error(`Error while transferring credit`, error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again after some time.',
    })
  }
}
