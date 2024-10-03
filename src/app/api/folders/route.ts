export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

import prisma from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const parentId = searchParams.get('parentId')
    const userToken = req.headers.get('x-user-token')
    const user = JSON.parse(userToken ?? '{}')
    let folders
    if (parentId || parentId === 'null') {
      folders = await prisma.folder.findMany({
        where: {
          userId: Number(user.userId),
          parentId: parentId !== 'null' ? Number(parentId) : null,
        },
      })
      const response = NextResponse.json({
        success: true,
        folders,
      })
      response.headers.delete('x-user-token')
      return response
    }
    return NextResponse.json({
      success: true,
      data: [],
    })
  } catch (error) {
    console.error('Failed to fetch folders:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
