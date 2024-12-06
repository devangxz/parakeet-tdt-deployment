export const dynamic = 'force-dynamic'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { generateUniqueId } from '@/utils/generateUniqueId'

export async function POST(req: Request) {
  const { fn, ln, pass, email, inviteKey } = await req.json()
  if (!fn || !ln || !pass || !email || !inviteKey) {
    return NextResponse.json({ e: -1, s: 'All fields are required' })
  }
  const referralCode = generateUniqueId()

  try {
    const invite = await prisma.invite.findUnique({
      where: { inviteKey },
      select: { email: true },
    })

    if (!invite) {
      return NextResponse.json({
        success: false,
        error: 'The invite key is not valid',
      })
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

    return NextResponse.json({
      success: true,
      s: 'Successfully created account',
    })
  } catch (error) {
    logger.error(error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try after some time.',
    })
  }
}
