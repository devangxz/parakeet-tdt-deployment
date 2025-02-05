export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'
import { getInvoicesHistory } from '@/services/invoice-service/get-invoices-history'

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const userId = user?.internalTeamUserId || user?.userId

    const invoices = await getInvoicesHistory(userId, false)
    if (!invoices.success) {
      return NextResponse.json(
        { message: 'Failed to fetch invoices' },
        { status: 500 }
      )
    }

    logger.info(`Sent ${invoices.data.length} invoices for user ${user.userId}`)
    return NextResponse.json({
      success: true,
      data: invoices.data,
    })
  } catch (error) {
    logger.error(`Failed to get invoices: ${error}`)
    return NextResponse.json(
      { message: 'Error fetching invoices' },
      { status: 500 }
    )
  }
}
