import { NextResponse } from 'next/server'

import { createUser } from '@/services/user-service'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password, firstname, lastname, role, phone, industry, rc } =
      body

    const result = await createUser({
      email: email.toLowerCase(),
      password,
      firstname,
      lastname,
      role,
      phone,
      industry,
      rc,
    })

    if (result.success) {
      return NextResponse.json(
        { message: 'User created successfully', user: result.user },
        { status: 201 }
      )
    } else {
      return NextResponse.json({ message: result.message }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
