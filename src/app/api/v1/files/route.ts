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

    return NextResponse.json({
      success: true,
      data: files?.data?.map((file) => ({
        fileId: file.fileId,
        filename: file.filename,
        duration: file.duration,
        filesize: file.filesize,
        uploadedBy: {
          email: file.uploadedByUser.email,
          firstname: file.uploadedByUser.firstName,
          lastname: file.uploadedByUser.lastName,
        },
        createdAt: file.createdAt,
        customInstructions: file.customInstructions,
        downloadCount: file.downloadCount,
      })),
    })
  } catch (error) {
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
