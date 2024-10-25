/* eslint-disable @typescript-eslint/no-unused-vars */
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

import { getFilesByStatus } from '@/services/file-service/get-files'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const userToken = req.headers.get('x-user-token')
    const user = JSON.parse(userToken ?? '{}')

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

    const response = NextResponse.json(files)
    response.headers.delete('x-user-token')
    return response
  } catch (error) {
    console.error('Error fetching files:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    // TODO: Implement file upload logic
    return NextResponse.json({ message: 'Not implemented' }, { status: 501 })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}