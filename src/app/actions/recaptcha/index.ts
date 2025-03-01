'use server'
import logger from '@/lib/logger'

export async function verifyRecaptcha(token: string) {
  try {
    if (!token) {
      return {
        success: false,
        error: 'Missing reCAPTCHA token',
      }
    }

    logger.info(`--> verifyRecaptcha ${token}`)

    const secret = process.env.RECAPTCHA_SECRET_KEY
    if (!secret) {
      return {
        success: false,
        error: 'Missing reCAPTCHA secret key',
      }
    }

    logger.info(`--> verifyRecaptcha ${secret}`)

    const response = await fetch(
      `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`,
      {
        method: 'POST',
      }
    )

    logger.info(`--> verifyRecaptcha ${response}`)

    if (!response.ok) {
      logger.error(`--> verifyRecaptcha ${response}`)
      return {
        success: false,
        error: 'Failed to verify reCAPTCHA',
      }
    }

    const data = await response.json()
    logger.info(`--> verifyRecaptcha data ${JSON.stringify(data)}`)
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
    logger.error(`--> verifyRecaptcha error ${error}`)
    return {
      success: false,
      error: 'Internal server error',
    }
  }
}
