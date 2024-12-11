import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import { transferFiles } from '@/services/admin/account-service'

export async function POST(req: Request) {
  try {
    const { userEmail, fileIds: fileIdsString } = await req.json()
    const fileIds = fileIdsString.split(',')
    const response = await transferFiles({ userEmail, fileIds })
    return NextResponse.json(response)
  } catch (error) {
    logger.error(`Error while transferring files`, error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again after some time.',
    })
  }
}
