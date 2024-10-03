export const cache = 'no-store'
import { NextResponse } from 'next/server'

import { getWorkspaces } from '@/services/team-service/get-workspaces'

export async function GET(req: Request) {
  try {
    const userToken = req.headers.get('x-user-token')
    const user = JSON.parse(userToken ?? '{}')

    const workspaces = await getWorkspaces(user.userId)
    const response = NextResponse.json(workspaces)
    response.headers.delete('x-user-token')
    return response
  } catch (error) {
    console.error('Error fetching workspaces:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
