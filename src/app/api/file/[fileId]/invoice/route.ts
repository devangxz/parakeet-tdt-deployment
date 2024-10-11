import { NextResponse } from 'next/server'

export async function GET(
  req: Request,
  { params }: { params: { fileId: string } }
) {
  try {
    const fileId = params.fileId
    console.log('fileId', fileId)
    // TODO: Implement invoice retrieval logic

    return NextResponse.json({ message: 'Not implemented' }, { status: 501 })
  } catch (error) {
    console.error('Error fetching invoice:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
