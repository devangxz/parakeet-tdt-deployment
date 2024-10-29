export const dynamic = 'force-dynamic'
import { JobType } from '@prisma/client'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import fetchHistoryFiles from '@/services/transcribe-service/legacy-file'

export async function GET(request: Request) {
  const userToken = request.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')
  const transcriberId = user?.userId
  try {
    const historyTranscriberFile = await fetchHistoryFiles(
      JobType.TR_LEGACY,
      transcriberId
    )

    logger.info(`History TR files fetched successfully for ${transcriberId}`)
    return NextResponse.json(historyTranscriberFile)
  } catch (error) {
    logger.error(error)
    return NextResponse.json({ error: 'Failed to fetch history TR files' })
  }
}
