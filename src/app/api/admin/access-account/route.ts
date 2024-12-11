/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import { accessAccount } from '@/services/admin/account-access'

export async function POST(req: Request) {
  const { email: userEmail } = await req.json()
  try {
    const response = await accessAccount(userEmail)
    return NextResponse.json(response)
  } catch (error) {
    logger.error(`Error occurred while switching user to ${userEmail}`, error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again after some time.',
    })
  }
}
