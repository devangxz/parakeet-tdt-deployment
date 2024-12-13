'use server'

import bcrypt from 'bcryptjs'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { generateUniqueId } from '@/utils/generateUniqueId'

interface CreateUserParams {
  fn: string
  ln: string
  pass: string
  email: string
  inviteKey: string
}

export async function createUser({
  fn,
  ln,
  pass,
  email,
  inviteKey,
}: CreateUserParams) {
  if (!fn || !ln || !pass || !email || !inviteKey) {
    return {
      success: false,
      message: 'All fields are required',
    }
  }

  const referralCode = generateUniqueId()

  try {
    const invite = await prisma.invite.findUnique({
      where: { inviteKey },
      select: { email: true },
    })

    if (!invite) {
      return {
        success: false,
        message: 'The invite key is not valid',
      }
    }

    const salt = bcrypt.genSaltSync(10)
    const hash = bcrypt.hashSync(pass, salt)

    await prisma.$transaction(async (prisma) => {
      const user = await prisma.user.update({
        where: { email },
        data: {
          pass: hash,
          salt: salt,
          firstname: fn,
          lastname: ln,
          status: 'VERIFIED',
          referralCode,
        },
      })

      await prisma.invite.updateMany({
        where: { email },
        data: { accepted: true },
      })

      await prisma.customer.create({
        data: { userId: user.id },
      })

      return user
    })

    return {
      success: true,
      message: 'Successfully created account',
    }
  } catch (error) {
    logger.error(error)
    return {
      success: false,
      message: 'An error occurred. Please try after some time.',
    }
  }
}
