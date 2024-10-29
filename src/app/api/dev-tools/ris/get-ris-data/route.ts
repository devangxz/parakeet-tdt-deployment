export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

import extractDataFromRISFile from '@/services/file-service/get-ris'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const fileId = searchParams.get('fileId')
  const template = searchParams.get('template')
  const organization = searchParams.get('organization')

  if (!fileId || !template || !organization) {
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    )
  }

  try {
    const risData = await extractDataFromRISFile(fileId, template, organization)

    return NextResponse.json({ success: true, risData })
  } catch (error) {
    console.error('Error fetching RIS data:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve RIS data' },
      { status: 500 }
    )
  }
}
