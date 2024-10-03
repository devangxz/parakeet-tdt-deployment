export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

import { getAllFiles } from '@/services/file-service/get-files'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const parentId = searchParams.get('parentId')
    const fileIds = searchParams.get('fileIds')
    const userHeader = req.headers.get('x-user-token')
    const user = JSON.parse(userHeader ?? '{}')

    const files = await getAllFiles(
      parentId !== 'null' ? Number(parentId) : null,
      fileIds ?? 'null',
      user.userId
    )
    return NextResponse.json(files)
  } catch (error) {
    console.error('Error fetching all files:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
