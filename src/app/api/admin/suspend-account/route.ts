import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import { updateAccountStatus } from '@/services/admin/account-service'

export async function POST(req: Request) {
  try {
    const { userEmail, flag } = await req.json()
    const response = await updateAccountStatus({ userEmail, flag })
    return NextResponse.json(response)
  } catch (error) {
    logger.error(`Error while updating account status`, error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again after some time.',
    })
  }
}
