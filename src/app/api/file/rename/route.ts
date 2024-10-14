import { NextResponse } from 'next/server'

import prisma from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const userToken = req.headers.get('x-user-token')
    const user = JSON.parse(userToken ?? '{}')

    const { fileId, filename } = await req.json()

    if (!fileId || !filename) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const fileExists = await prisma.file.findUnique({
      where: { fileId, userId: user.userId },
    })

    if (!fileExists) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const updatedFile = await prisma.file.update({
      where: { fileId, userId: user.userId },
      data: { filename: filename },
    })

    if (!updatedFile) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    return NextResponse.json({
      message: 'File renamed successfully',
      file: updatedFile,
    })
  } catch (error) {
    console.error('Error renaming file:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
