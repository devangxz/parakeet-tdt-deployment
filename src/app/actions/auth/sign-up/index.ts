'use server'

import { createUser } from '@/services/user-service'

interface SignUpParams {
  email: string
  password: string
  firstname: string
  lastname: string
  role: string
  phone: string
  industry: string
  rc: string
  newsletter: boolean
}

export async function signUp({
  email,
  password,
  firstname,
  lastname,
  role,
  phone,
  industry,
  rc,
  newsletter,
}: SignUpParams) {
  try {
    const result = await createUser({
      email: email.toLowerCase(),
      password,
      firstname,
      lastname,
      role,
      phone,
      industry,
      rc,
      newsletter,
    })

    if (result.success) {
      return {
        success: true,
        message: 'User created successfully',
        user: result.user,
        status: 201,
      }
    } else {
      return {
        success: false,
        message: result.message,
        status: 400,
      }
    }
  } catch (error) {
    return {
      success: false,
      message: 'Internal server error',
      status: 500,
    }
  }
}
