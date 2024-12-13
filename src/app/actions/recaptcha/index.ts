'use server'

export async function verifyRecaptcha(token: string) {
  try {
    if (!token) {
      return {
        success: false,
        error: 'Missing reCAPTCHA token',
      }
    }

    const secret = process.env.RECAPTCHA_SECRET_KEY
    if (!secret) {
      return {
        success: false,
        error: 'Missing reCAPTCHA secret key',
      }
    }

    const response = await fetch(
      `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`,
      {
        method: 'POST',
      }
    )

    if (!response.ok) {
      return {
        success: false,
        error: 'Failed to verify reCAPTCHA',
      }
    }

    const data = await response.json()
    if (!data.success) {
      return {
        success: false,
        error: 'reCAPTCHA verification failed',
      }
    }

    return {
      success: true,
      message: 'reCAPTCHA validation successful',
      response: data,
    }
  } catch (error) {
    return {
      success: false,
      error: 'Internal server error',
    }
  }
}
