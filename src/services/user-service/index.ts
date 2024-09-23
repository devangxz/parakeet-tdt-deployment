import { User } from '@prisma/client'
import bcrypt from 'bcrypt'
import { v4 as uuidv4 } from 'uuid'

import prisma from '@/lib/prisma'
import isValidEmail from '@/utils/isValidEmail'

interface CreateUserData {
  email: string
  password: string
  firstname: string
  lastname: string
  role: string
  phone: string
  industry: string
}

export async function createUser(
  userData: CreateUserData
): Promise<{ success: boolean; message: string; user?: User }> {
  const { email, password, firstname, lastname, role, phone, industry } =
    userData
  try {
    const referralCode = uuidv4()
    const inviteKey = uuidv4()

    if (!isValidEmail(email)) {
      return {
        success: false,
        message: 'Invalid email format',
      }
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return { success: false, message: 'User with this email already exists' }
    }

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    const newUser = await prisma.user.create({
      data: {
        email,
        pass: hashedPassword,
        salt,
        firstname,
        lastname,
        role: role === 'customer' ? 'CUSTOMER' : 'TRANSCRIBER',
        user: email,
        referralCode,
        phoneNumber: phone,
        industry,
      },
    })

    if (role === 'customer') {
      await prisma.customer.create({
        data: {
          userId: newUser.id,
        },
      })
    }

    await prisma.invite.create({
      data: {
        email,
        inviteKey,
      },
    })

    // TODO: Implement email sending functionality
    // sendInviteEmail(email, inviteKey);

    return {
      success: true,
      message: 'User created successfully',
      user: newUser,
    }
  } catch (error) {
    console.error('Error creating user:', error)
    return { success: false, message: 'Failed to create user' }
  }
}
