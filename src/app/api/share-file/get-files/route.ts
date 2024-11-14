import { NextRequest, NextResponse } from 'next/server'

import { getSharedFiles } from '@/services/file-service/get-files'

export async function GET(request: NextRequest) {
  const userToken = request.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')

  const response = await getSharedFiles(user.internalTeamUserId || user.userId)

  return NextResponse.json(response)
}
