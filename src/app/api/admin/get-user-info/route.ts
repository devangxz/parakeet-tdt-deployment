import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import { getUserInfo } from '@/services/admin/user-info-service'

export async function POST(req: Request) {
  try {
    const { id } = await req.json()
    const response = await getUserInfo({ id })
    return NextResponse.json(response)
  } catch (error) {
    logger.error(`Error while fetching user info`, error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again after some time.',
    })
  }
}
