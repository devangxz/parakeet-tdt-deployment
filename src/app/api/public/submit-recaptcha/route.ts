import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { gRecaptchaToken: token } = body

    if (!token) {
      return NextResponse.json(
        { error: 'Missing reCAPTCHA token' },
        { status: 400 }
      )
    }

    const secret = process.env.RECAPTCHA_SECRET_KEY
    if (!secret) {
      return NextResponse.json(
        { error: 'Missing reCAPTCHA secret key' },
        { status: 500 }
      )
    }

    const response = await fetch(
      `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`,
      {
        method: 'POST',
      }
    )

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to verify reCAPTCHA' },
        { status: 500 }
      )
    }

    const data = await response.json()
    if (!data.success) {
      return NextResponse.json(
        { error: 'reCAPTCHA verification failed' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'reCAPTCHA validation successful', response: data },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
