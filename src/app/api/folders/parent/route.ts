export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

import prisma from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const folderId = searchParams.get('folderId')
    if (!folderId) {
      return NextResponse.json({
        success: false,
        message: 'Folder ID is required',
      })
    }

    const folderHierarchy = []
    let currentFolderId = Number(folderId)
    while (currentFolderId) {
      const folder = await prisma.folder.findUnique({
        where: { id: Number(currentFolderId) },
      })

      if (!folder) {
        break
      }

      folderHierarchy.unshift(folder)
      currentFolderId = folder.parentId as number
    }
    return NextResponse.json({
      success: true,
      folderHierarchy,
    })
  } catch (error) {
    console.error('Failed to fetch parent folders:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
