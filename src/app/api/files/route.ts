/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    // TODO: Implement file listing logic
    return NextResponse.json({ message: 'Not implemented' }, { status: 501 })
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
