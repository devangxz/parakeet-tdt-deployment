export const dynamic = 'force-dynamic'
import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const inviteKey = req.nextUrl.searchParams.get('inviteKey') ?? ''

  try {
    const invite = await prisma.invite.findUnique({
      where: { inviteKey },
    })

    if (!invite || !invite.email) {
      logger.error(`Invite not found for key ${inviteKey}`)
      return NextResponse.json({
        success: false,
        error: 'Invite not found for the given key',
      })
    }

    if (invite.accepted) {
      return NextResponse.redirect('/account/sign-in')
    }

    const user = await prisma.user.findUnique({
      where: { email: invite.email },
    })

    if (!user) {
      logger.error(`User not found for email ${invite.email}`)
      return NextResponse.json({
        success: false,
        error: 'User not found for the given email',
      })
    }

    if (user.status !== 'CREATED') {
      logger.info(`User ${user.id} is already a member of a team`)
      return NextResponse.redirect('/account/sign-in')
    }

    const teamMember = await prisma.teamMember.findFirst({
      where: { userId: user.id },
    })

    if (!teamMember) {
      logger.error(`Team ID not found for user ${user.id}`)
      return NextResponse.json({
        success: false,
        error: 'Invite not found for the given key',
      })
    }

    const team = await prisma.team.findUnique({
      where: { id: teamMember.teamId },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    })

    if (!team) {
      logger.error(`Team not found for user ${user.id}`)
      return NextResponse.json({
        success: false,
        error: 'Team not found for the given user',
      })
    }

    const owner = team.members.find((member) => member.userId === team.owner)

    if (!owner) {
      logger.error(`Team owner not found for team ${team.id}`)
      return NextResponse.json({
        success: false,
        error: 'Team owner not found',
      })
    }

    const info = {
      email: invite.email,
      userId: user.id,
      teamId: team.id,
      ownerEmail: owner.user.email,
      ownerFullname: `${owner.user.firstname || ''} ${
        owner.user.lastname || ''
      }`.trim(),
      ownerFirstname: owner.user.firstname || '',
      ownerName:
        `${owner.user.firstname || ''} ${owner.user.lastname || ''}`.trim() ||
        owner.user.email,
    }

    return NextResponse.json({
      success: true,
      details: info,
    })
  } catch (error) {
    logger.error(error)
    return NextResponse.json({
      success: false,
      error: 'The group invite is not valid',
    })
  }
}

export async function POST(req: Request) {
  const { fn, ln, pass, email } = await req.json()
  if (!fn || !ln || !pass || !email) {
    return NextResponse.json({ e: -1, s: 'All fields are required' })
  }
  const referralCode = uuidv4()

  try {
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

      await prisma.teamMember.updateMany({
        where: { userId: user.id },
        data: { status: 'ACCEPTED' },
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

    return NextResponse.json({ success: true, s: 'Successfully joined team' })
  } catch (error) {
    logger.error(error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try after some time.',
    })
  }
}
