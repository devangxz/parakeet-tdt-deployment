export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

import { authenticateRequest } from '@/services/auth-service/authenticate-api'
import { getFilesByStatus } from '@/services/file-service/get-files'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    const user = await authenticateRequest(req as NextRequest)

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    if (!status) {
      return NextResponse.json(
        { message: 'Status is required' },
        { status: 400 }
      )
    }

    const files = await getFilesByStatus(
      status,
      user.userId,
      user.internalTeamUserId
    )

    return NextResponse.json(files)
  } catch (error) {
    console.error('Error fetching files:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
